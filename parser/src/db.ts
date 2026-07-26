import mysql from 'mysql2/promise';
import { config } from './config';

export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 5,
  dateStrings: true,
});

export async function isMessageAlreadyFetched(telegramMessageId: number): Promise<boolean> {
  const [rows] = await pool.query<any[]>(
    'SELECT id FROM tender_sources_raw WHERE telegram_message_id = ?',
    [telegramMessageId],
  );
  return (rows as any[]).length > 0;
}

export async function saveRawSource(data: {
  telegramMessageId: number;
  rawText: string;
  rawMediaPaths: string[];
  parsedTitle: string | null;
  parsedSum: number | null;
  parsedDeadline: string | null;
}) {
  await pool.query(
    `INSERT INTO tender_sources_raw
      (telegram_message_id, raw_text, raw_media_paths, parsed_title, parsed_sum, parsed_deadline, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.telegramMessageId,
      data.rawText,
      JSON.stringify(data.rawMediaPaths),
      data.parsedTitle,
      data.parsedSum,
      data.parsedDeadline,
    ],
  );
}
