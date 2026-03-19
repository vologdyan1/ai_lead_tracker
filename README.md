# AI Lead Tracker

Система управления лидами с AI-аналитикой: OAuth через Google, realtime-лиды, webhook-интеграция, Telegram-уведомления и AI summary.

## Demo

- Production: `https://aileadtracker.vercel.app`
- Вход: кнопка `Войти через Google`
- Быстрая проверка: login -> открыть лид -> сгенерировать AI summary -> webhook POST

## Features

- Google OAuth (Supabase Auth)
- CRUD лидов + realtime обновления
- AI summary для лида (Groq + fallback)
- Webhook endpoint `/api/webhook` с секретом `x-webhook-secret`
- Telegram уведомления при входящем webhook

## Quick Start

```bash
git clone https://github.com/vologdyan1/ai_lead_tracker.git
cd ai_lead_tracker
npm install
```

Создай `.env.local` (или скопируй из `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
GROQ_MODEL=llama-3.1-8b-instant
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
WEBHOOK_SECRET=
```

Выполни SQL из `supabase/migration.sql` в Supabase SQL Editor, затем:

```bash
npm run dev
```

## Deploy (Vercel)

1. Импортируй репозиторий `vologdyan1/ai_lead_tracker` в Vercel.
2. Добавь все переменные окружения из `.env.example` в `Project Settings -> Environment Variables`.
3. Для прода укажи:
   - `NEXT_PUBLIC_AUTH_REDIRECT_URL=https://aileadtracker.vercel.app/auth/callback`
4. В Supabase Auth -> URL Configuration добавь:
   - `https://aileadtracker.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`

## Webhook Test

PowerShell:

```powershell
$secret = "your_webhook_secret"
$body = @{
  name   = "Webhook Test Lead"
  email  = "webhook-test@example.com"
  phone  = "+79990001122"
  source = "website"
  notes  = "Webhook smoke test"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "https://aileadtracker.vercel.app/api/webhook" `
  -Headers @{
    "Content-Type"     = "application/json"
    "x-webhook-secret" = $secret
  } `
  -Body $body
```

Ожидаемо: `success: true`, новый лид в приложении и сообщение в Telegram.
