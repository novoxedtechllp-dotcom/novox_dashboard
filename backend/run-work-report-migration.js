import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('Migration error: DATABASE_URL environment variable is missing.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  let connected = false;

  try {
    const sql = fs.readFileSync(path.resolve(__dirname, 'src/db/work_report_migration.sql'), 'utf8');
    console.log('Connecting to database...');
    await client.connect();
    connected = true;
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Work report migration completed successfully.');
  } catch (error) {
    if (connected) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        console.error('Migration rollback failed:', rollbackError.message);
      });
    }
    console.error('Migration error:', error.message);
    process.exitCode = 1;
  } finally {
    if (connected) await client.end();
  }
}

runMigration();
