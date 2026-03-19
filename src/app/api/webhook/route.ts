import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://matveeva-design.pro',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const authHeader = request.headers.get('x-webhook-secret');

    if (!webhookSecret || authHeader !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const payload = await request.json();
    const { name, email, phone, source, notes } = payload;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400, headers: corsHeaders });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileError || !profiles || profiles.length === 0) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'No user profile found.' },
        { status: 409, headers: corsHeaders }
      );
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
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 500, headers: corsHeaders });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId) {
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const telegramBody = {
        chat_id: chatId,
        text: `🔔 Новый лид!\n\nИмя: ${name}\nEmail: ${email ?? '—'}\nТелефон: ${phone ?? '—'}\nИсточник: ${source ?? '—'}`,
      };

      try {
        const tgRes = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramBody),
        });
        const tgJson = await tgRes.json();
        return NextResponse.json({ success: true, lead, tgJson }, { headers: corsHeaders });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown Telegram error';
        return NextResponse.json({ success: true, lead, tgError: message }, { headers: corsHeaders });
      }
    }

    return NextResponse.json({ success: true, lead }, { headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}