import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    const sql = fs.readFileSync(path.resolve(__dirname, 'src/db/fee_migration.sql'), 'utf8');
    console.log('Connecting to database...');
    await client.connect();
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✓ Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('Migration rollback failed:', rollbackError.message);
    });
    console.error('Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runMigration();
