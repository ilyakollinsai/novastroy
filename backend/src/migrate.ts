import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { config } from './config';

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');

async function run() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true,
  });

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [rows] = await connection.query<mysql.RowDataPacket[]>(
    'SELECT name FROM schema_migrations',
  );
  const applied = new Set(rows.map((r) => r.name as string));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`applying: ${file}`);
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  }

  await connection.end();
  console.log('Migrations complete.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
