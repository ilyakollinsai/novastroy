import fs from 'fs';
import path from 'path';
import { Api } from 'telegram';
import { config } from './config';
import { getClient } from './client';
import { extractDeadline, extractSum, extractTitle } from './extract';
import { isMessageAlreadyFetched, saveRawSource, pool } from './db';

async function downloadMediaIfAny(client: any, message: any): Promise<string[]> {
  if (!message.media) return [];
  try {
    fs.mkdirSync(config.mediaDir, { recursive: true });
    const buffer = await client.downloadMedia(message.media, {});
    if (!buffer) return [];
    const ext = message.document?.mimeType?.split('/')?.[1] ?? 'jpg';
    const filename = `${message.id}-${Date.now()}.${ext}`;
    const filePath = path.join(config.mediaDir, filename);
    fs.writeFileSync(filePath, buffer as Buffer);
    return [filePath];
  } catch (err) {
    console.error(`Не удалось скачать медиа сообщения ${message.id}:`, err);
    return [];
  }
}

async function pollOnce() {
  console.log(`[${new Date().toISOString()}] Опрос канала @${config.telegram.channel}…`);
  const client = await getClient();
  try {
    const entity = await client.getEntity(config.telegram.channel);
    const messages = await client.getMessages(entity, { limit: 50 });

    // getMessages отдаёт сообщения от новых к старым — обрабатываем в хронологическом порядке.
    const ordered = [...messages].reverse();

    for (const message of ordered) {
      if (!(message instanceof Api.Message)) continue;
      if (!message.message && !message.media) continue;

      const alreadyFetched = await isMessageAlreadyFetched(message.id);
      if (alreadyFetched) continue;

      const rawText = message.message ?? '';
      const mediaPaths = await downloadMediaIfAny(client, message);

      await saveRawSource({
        telegramMessageId: message.id,
        rawText,
        rawMediaPaths: mediaPaths,
        parsedTitle: extractTitle(rawText),
        parsedSum: extractSum(rawText),
        parsedDeadline: extractDeadline(rawText),
      });

      console.log(`Сохранён новый пост #${message.id} в очередь модерации.`);
    }
  } finally {
    await client.disconnect();
  }
}

async function main() {
  await pollOnce().catch((err) => console.error('Ошибка опроса канала:', err));

  const intervalMs = config.pollIntervalMinutes * 60 * 1000;
  setInterval(() => {
    pollOnce().catch((err) => console.error('Ошибка опроса канала:', err));
  }, intervalMs);
}

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});

main();
