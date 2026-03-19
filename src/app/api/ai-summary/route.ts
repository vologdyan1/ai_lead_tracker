import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function buildFallbackSummary(lead: {
  name?: string | null
  source?: string | null
  status?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
}) {
  const contact = lead.email || lead.phone
    ? `Контакт есть (${lead.email ? 'email' : ''}${lead.email && lead.phone ? ' и ' : ''}${lead.phone ? 'телефон' : ''}).`
    : 'Контактных данных мало, сначала уточни email или телефон.'

  const notesHint = lead.notes
    ? `По заметкам: ${String(lead.notes).slice(0, 160)}${String(lead.notes).length > 160 ? '...' : ''}`
    : 'Заметок пока нет.'

  return [
    `Лид ${lead.name ?? 'без имени'} из источника "${lead.source ?? 'unknown'}" со статусом "${lead.status ?? 'new'}".`,
    contact,
    notesHint,
    'Первый шаг: короткий контакт в течение 15 минут, зафиксировать потребность и назначить следующий конкретный шаг.'
  ].join(' ')
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { leadId } = await req.json()
    if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    let summary: string | null = null
    let fallback = false

    if (process.env.GROQ_API_KEY) {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: `Ты — ассистент по продажам. Проанализируй лида и дай краткое саммари (3-4 предложения): что известно, какой потенциал, что рекомендуешь сделать первым шагом.

Данные лида:
Имя: ${lead.name}
Email: ${lead.email ?? '—'}
Телефон: ${lead.phone ?? '—'}
Источник: ${lead.source ?? '—'}
Заметки: ${lead.notes ?? '—'}
Статус: ${lead.status}`
            }
          ],
        }),
      })

      if (!groqRes.ok) {
        const groqErrorText = await groqRes.text()
        console.error('Groq API error:', groqRes.status, groqErrorText)
        fallback = true
      } else {
        const groqData = await groqRes.json()
        summary = groqData.choices?.[0]?.message?.content?.trim() ?? null
      }
    } else {
      fallback = true
    }

    if (!summary) {
      summary = buildFallbackSummary(lead)
      fallback = true
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update({ ai_summary: summary })
      .eq('id', lead.id)

    if (updateError) {
      console.error('Error saving AI summary:', updateError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({ success: true, summary, fallback })
  } catch (e) {
    console.error('AI summary error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}