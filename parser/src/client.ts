import fs from 'fs';
import path from 'path';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { config } from './config';

export function loadSessionString(): string {
  if (!fs.existsSync(config.sessionFile)) return '';
  return fs.readFileSync(config.sessionFile, 'utf8').trim();
}

export function saveSessionString(session: string) {
  fs.mkdirSync(path.dirname(config.sessionFile), { recursive: true });
  fs.writeFileSync(config.sessionFile, session, 'utf8');
}

export async function getClient(): Promise<TelegramClient> {
  const sessionString = loadSessionString();
  if (!sessionString) {
    throw new Error(
      'Сессия Telegram не найдена. Сначала выполните `npm run login` в каталоге parser/, ' +
        'чтобы один раз авторизоваться под аккаунтом, подписанным на канал.',
    );
  }
  const client = new TelegramClient(
    new StringSession(sessionString),
    config.telegram.apiId,
    config.telegram.apiHash,
    { connectionRetries: 5 },
  );
  await client.connect();
  return client;
}
