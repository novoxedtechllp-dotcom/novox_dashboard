import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:DB_Dashboard26@db.ybtpofrmpnozbxifilqr.supabase.co:5432/postgres"
});

async function run() {
  await client.connect();
  
  console.log('Adding note column to leads table...');
  await client.query(`
    ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS note TEXT;
    NOTIFY pgrst, 'reload schema';
  `);
  
  console.log('Done!');
  await client.end();
}

run().catch(console.error);