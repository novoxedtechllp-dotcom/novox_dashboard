import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

// Configure dotenv to load from the correct backend directory root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const setupDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is missing.');
    console.error('Make sure you have added your Supabase connection string to the .env file.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();

    console.log('Reading schema.sql...');
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema. This might take a moment...');

    await client.query('BEGIN');
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('✅ Database tables, types, and indexes created successfully!');
  } catch (error) {
    console.error('❌ Error executing the schema:', error);
    await client.query('ROLLBACK').catch((rollbackError) => {
      console.error('❌ Failed to roll back schema transaction:', rollbackError);
    });
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
};

setupDatabase();
