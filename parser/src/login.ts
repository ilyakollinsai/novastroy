import readline from 'readline';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { config } from './config';
import { saveSessionString } from './client';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question: string): Promise<string> =>
  new Promise((resolve) => rl.question(question, resolve));

// Разовая интерактивная авторизация обычного Telegram-аккаунта (не бота).
// Результат — session string, который переиспользует воркер парсера (index.ts).
async function main() {
  if (!config.telegram.apiId || !config.telegram.apiHash) {
    throw new Error('Заполните TG_API_ID и TG_API_HASH в parser/.env (получить на my.telegram.org)');
  }

  const client = new TelegramClient(
    new StringSession(''),
    config.telegram.apiId,
    config.telegram.apiHash,
    { connectionRetries: 5 },
  );

  await client.start({
    phoneNumber: async () => config.telegram.phone || (await ask('Номер телефона: ')),
    password: async () => ask('Пароль двухфакторной аутентификации (если включена): '),
    phoneCode: async () => ask('Код из Telegram: '),
    onError: (err) => console.error(err),
  });

  const sessionString = client.session.save() as unknown as string;
  saveSessionString(sessionString);
  console.log(`Сессия сохранена в ${config.sessionFile}`);
  console.log('Теперь можно запускать воркер: npm run dev (или npm run build && npm start)');

  await client.disconnect();
  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Ошибка авторизации:', err);
  process.exit(1);
});
