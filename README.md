# Строй Инжиниринг — портал тендеров для подрядчиков

Web-приложение для публикации тендеров строительной компании «Строй Инжиниринг» и приёма заявок
от подрядчиков. Заменяет ручную публикацию тендеров в Telegram-канале.

## Состав репозитория

```
backend/   Express API + MySQL (auth, тендеры, заявки, профиль, админка)
frontend/  Next.js (App Router) + Tailwind — сайт для подрядчиков и админка
parser/    Воркер парсинга публичного Telegram-канала (gramjs/MTProto)
```

Каждый каталог — самостоятельный Node.js-проект со своим `package.json` и `.env`.

## Роли

- **Подрядчик** — регистрируется, ведёт профиль, просматривает тендеры, подаёт заявки,
  видит статусы своих заявок и историю побед.
- **Админ** (сотрудник «Строй Инжиниринг») — создаёт тендеры вручную, модерирует посты из Telegram,
  обрабатывает заявки, назначает победителя.

Первый пользователь с ролью `admin` создаётся вручную в БД (см. ниже) — публичной регистрации
администраторов в приложении нет.

## Быстрый старт (локально)

### 1. База данных

Создайте БД MySQL и примените миграции:

```bash
cd backend
cp .env.example .env      # укажите реквизиты MySQL
npm install
npm run migrate
```

Чтобы завести первого администратора, сгенерируйте bcrypt-хэш пароля и вставьте запись вручную:

```bash
node -e "console.log(require('bcryptjs').hashSync('ваш-пароль', 10))"
```

```sql
INSERT INTO users (email, password_hash, role) VALUES ('admin@novastroy.ru', '<хэш>', 'admin');
```

### 2. Backend (Express API)

```bash
cd backend
npm run dev        # http://localhost:4000
```

### 3. Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev         # http://localhost:3000
```

### 4. Парсер Telegram (опционально для локальной разработки)

Разовая авторизация обычного Telegram-аккаунта, подписанного на публичный канал:

```bash
cd parser
cp .env.example .env   # TG_API_ID/TG_API_HASH с my.telegram.org, TG_PHONE, TG_CHANNEL
npm install
npm run login          # один раз: введёте код из Telegram (и пароль 2FA, если включён)
npm run dev            # периодически опрашивает канал и пишет в tender_sources_raw
```

Session string сохраняется в `parser/session/session.txt` (в `.gitignore`, не коммитится) —
воркер переиспользует его при последующих запусках, повторная авторизация не нужна.

Новые посты попадают в очередь модерации `tender_sources_raw` (`status = 'pending'`) и
становятся видны в **Админка → Модерация Telegram**. Ничего не публикуется автоматически —
администратор проверяет и подтверждает поля перед созданием тендера.

## API

Полный список эндпоинтов — см. код в `backend/src/routes/*.ts`. Кратко:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/tenders`, `GET /api/tenders/:id`, `GET /api/tenders/:id/attachments/:fileId`
  (публичные — черновики `status=draft` не показываются)
- `POST /api/tenders/:id/applications` (multipart), `GET /api/applications/me`,
  `GET /api/applications/:id`, `GET /api/applications/:id/attachments/:fileId`
- `GET/PUT /api/profile`
- `/api/admin/*` — CRUD тендеров, управление заявками, назначение победителя,
  модерация `tender_sources_raw` (роль `admin`)

## Дизайн

Фронтенд использует «документооборотный» деловой стиль: бумажный фон, чернильная типографика
(заголовки — serif), статусы тендеров и заявок оформлены как печати (`.stamp` в
`frontend/app/globals.css`, токены цвета — `frontend/tailwind.config.ts`).

## Развёртывание на Sprint Host (аккаунт a1266828)

1. **MySQL** — создайте базу и пользователя в панели управления, впишите реквизиты
   в `backend/.env` и `parser/.env`.
2. **Backend** — через Node.js Selector в панели: `npm install --production && npm run build`,
   точка входа `dist/index.js`, задать переменные окружения из `backend/.env.example`.
   Каталог `backend/uploads/` должен быть доступен на запись — там хранятся вложения
   тендеров и заявок (локальное хранилище, без S3).
3. **Frontend** — `npm install && npm run build && npm start` (или через Node.js Selector),
   `NEXT_PUBLIC_API_URL` должен указывать на публичный адрес backend.
4. **Parser** — отдельный долгоживущий процесс (Node.js Selector с `npm start` после
   `npm run build`, либо pm2/systemd, если на тарифе доступен произвольный процесс).
   Авторизацию (`npm run login`) нужно один раз выполнить в интерактивном режиме (SSH),
   после чего `parser/session/session.txt` копируется на сервер и воркер запускается
   автономно по расписанию.

## Принятые по умолчанию решения (открытые вопросы ТЗ)

Технического задания недостаточно, чтобы однозначно ответить на три пункта — сделаны следующие
допущения; при необходимости — легко изменить:

- **Верификация подрядчиков.** Регистрация свободная, без модерации админом. Быстро добавить
  флаг `is_verified` в `contractor_profiles` и экран подтверждения в админке, если потребуется.
- **Уведомления о смене статуса заявки.** Не реализованы в этой итерации. Список кандидатов
  на будущее: email (проще всего — уже есть `users.email`) или сообщение Telegram-ботом.
- **Экспорт реестра заявок в Excel.** Не реализован в этой итерации — при необходимости
  проще всего добавить как `GET /api/admin/applications/export` (CSV/XLSX) поверх
  существующего `GET /api/admin/applications`.

## Известное ограничение

Пакет `telegram` (gramjs), которым пользуется парсер, официально архивирован автором — он
рекомендует форк `teleproto` как поддерживаемую совместимую замену. Указан именно `gramjs`,
как и было запрошено в ТЗ; при необходимости долгосрочной поддержки стоит рассмотреть переход
на `teleproto` (замена в основном сводится к имени пакета в `parser/src/client.ts`).
