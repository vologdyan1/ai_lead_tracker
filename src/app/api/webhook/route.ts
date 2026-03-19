import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('x-webhook-secret');

    if (!webhookSecret || authHeader !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { name, email, phone, source, notes } = payload;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Получаем первого пользователя из таблицы profiles для MVP
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json({ error: 'Database error: No user found' }, { status: 500 });
    }

    const userId = profiles[0].id;

    const leadData = {
      user_id: userId,
      name,
      email: email || null,
      phone: phone || null,
      source: source ?? 'webhook',
      status: 'new',
      notes: notes || null,
      raw_payload: payload,
    };

    const { data: lead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert(leadData)
      .select('id, name')
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }

    // Отправка уведомления в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
      const telegramBody = {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `🔔 Новый лид!\n\nИмя: ${name}\nEmail: ${email ?? '—'}\nТелефон: ${phone ?? '—'}\nИсточник: ${source ?? '—'}`,
      }

      console.log('Sending Telegram:', telegramUrl, telegramBody)

      try {
        const tgRes = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramBody),
        })

        const tgJson = await tgRes.json()
        console.log('Telegram response:', JSON.stringify(tgJson))
        return NextResponse.json({ success: true, lead, tgJson, telegramBody })
      } catch (err: any) {
        console.error('Error sending telegram message:', err)
        return NextResponse.json({ success: true, lead, tgError: err.message, telegramBody })
      }
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req: NextRequest) {
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

  const prompt = `Ты — ассистент по продажам. Проанализируй лида и дай краткое саммари (3-4 предложения): что известно, какой потенциал, что рекомендуешь сделать первым шагом.

Данные лида:
Имя: ${lead.name}
Email: ${lead.email ?? '—'}
Телефон: ${lead.phone ?? '—'}
Источник: ${lead.source ?? '—'}
Заметки: ${lead.notes ?? '—'}
Статус: ${lead.status}`

  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.1-8b-instant',
  })

  const summary = completion.choices[0]?.message?.content ?? 'Не удалось сгенерировать саммари'

  await supabase
    .from('leads')
    .update({ ai_summary: summary })
    .eq('id', leadId)

  await supabase
    .from('lead_events')
    .insert({
      lead_id: leadId,
      user_id: user.id,
      type: 'ai_summary',
      payload: { summary },
    })

  return NextResponse.json({ success: true, summary })
}
