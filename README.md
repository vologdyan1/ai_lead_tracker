# ai_lead_tracker
AI-powered lead management system built with Next.js 16, Supabase, and Groq. Features Google OAuth, real-time updates, webhook integration, Telegram notifications, and automatic AI summaries for each lead.
# AI Lead Tracker

Система управления лидами с AI-аналитикой. Полный стек: Next.js 16, Supabase, Groq AI.

## Что умеет

- **Google OAuth** — вход через Google аккаунт
- **Управление лидами** — добавление, просмотр, смена статуса, удаление
- **Real-time обновления** — новые лиды появляются без перезагрузки страницы
- **Webhook** — приём лидов от внешних систем (сайт, CRM, формы)
- **Telegram уведомления** — мгновенное оповещение при новом лиде от webhook
- **AI саммари** — автоматический анализ лида через Groq (Llama 3) при открытии карточки
- **Безопасность** — WEBHOOK_SECRET, валидация данных, rate limiting, whitelist доменов

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| База данных | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Real-time | Supabase Realtime |
| AI | Groq API (Llama 3.1 8b) |
| Деплой | Vercel |

## Архитектура
```
Браузер → Next.js App → Supabase (БД + Auth + Realtime)
                     → Groq API (AI саммари)
                     → Telegram Bot API (уведомления)
Внешний сайт → /api/webhook → Supabase + Telegram
```

## Быстрый старт

### 1. Клонируй репозиторий
```bash
git clone https://github.com/vologdyan1/ai_lead_tracker.git
cd ai_lead_tracker
npm install
```

### 2. Настрой переменные окружения

Создай `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
WEBHOOK_SECRET=your_secret
```

### 3. Выполни SQL миграцию

Скопируй содержимое `supabase/migration.sql` и выполни в Supabase SQL Editor.

### 4. Запусти
```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000)

## Webhook интеграция

Отправь POST запрос на `/api/webhook` чтобы добавить лида из внешней системы:
```bash
curl -X POST https://твой-домен.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: твой_секрет" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "phone": "+7 999 000 00 00",
    "source": "website",
    "notes": "Интересует продукт X"
  }'
```

## Деплой на Vercel

1. Импортируй репозиторий в Vercel: `vologdyan1/ai_lead_tracker`
2. В `Project Settings -> Environment Variables` добавь:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `WEBHOOK_SECRET`
3. В Supabase Auth добавь Redirect URL:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-domain>/auth/callback`
4. Нажми Deploy.

## Структура проекта
```
src/
├── app/
│   ├── api/
│   │   ├── webhook/        # Приём внешних лидов
│   │   └── ai-summary/     # Генерация AI саммари
│   ├── auth/callback/      # OAuth callback
│   ├── leads/              # Главная страница
│   └── login/              # Страница входа
├── components/
│   └── leads/
│       ├── LeadsClient.tsx  # Таблица лидов + Realtime
│       ├── LeadModal.tsx    # Карточка лида
│       └── AddLeadModal.tsx # Форма добавления
└── lib/
    ├── supabase/            # Клиенты Supabase
    └── types.ts             # TypeScript типы
```
