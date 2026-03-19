import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const { origin } = new URL(request.url);
  const webhookUrl = `${origin}/api/webhook`;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.WEBHOOK_SECRET || '',
      },
      body: JSON.stringify({
        name: 'Тестовый Лид',
        email: 'test@example.com',
        phone: '+79990001122',
        source: 'test endpoint',
        notes: 'Это тестовый лид из /api/webhook/test',
        custom_field: 'test_value'
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      status: response.status,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
