import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { leadId } = await req.json()
        if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

        const { data: lead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
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

        const groqData = await groqRes.json()
        const summary = groqData.choices?.[0]?.message?.content ?? 'Не удалось сгенерировать саммари'

        await supabase
            .from('leads')
            .update({ ai_summary: summary })
            .eq('id', lead.id)

        return NextResponse.json({ success: true, summary })

    } catch (e) {
        console.error('AI summary error:', e)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}