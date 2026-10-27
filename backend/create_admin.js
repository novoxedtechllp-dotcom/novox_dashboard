import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Client } = pg;
const { DATABASE_URL, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL || !INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD) {
  console.error('Set DATABASE_URL, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD before running this script.');
  process.exit(1);
}

if (INITIAL_ADMIN_PASSWORD.length < 12) {
  console.error('INITIAL_ADMIN_PASSWORD must be at least 12 characters long.');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query('BEGIN');

  const { rows: existingUsers } = await client.query(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [INITIAL_ADMIN_EMAIL],
  );
  if (existingUsers.length > 0) {
    throw new Error('A user with that email already exists; no account was changed.');
  }

  const { rows: roles } = await client.query(
    "SELECT id FROM employee_roles WHERE role_name = 'HR'",
  );
  if (roles.length === 0) {
    throw new Error('The HR employee role is missing. Initialize the database schema first.');
  }

  const passwordHash = await bcrypt.hash(INITIAL_ADMIN_PASSWORD, 12);
  const { rows: users } = await client.query(
    `INSERT INTO users (email, password_hash, role, status)
     VALUES ($1, $2, 'ADMIN', 'ACTIVE')
     RETURNING id`,
    [INITIAL_ADMIN_EMAIL, passwordHash],
  );

  const firstName = process.env.INITIAL_ADMIN_FIRST_NAME || 'System';
  const lastName = process.env.INITIAL_ADMIN_LAST_NAME || 'Admin';
  await client.query(
    `INSERT INTO employee_profiles
       (user_id, employee_code, first_name, last_name, joining_date, designation, role_id, salary)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Administrator', $5, 0)`,
    [users[0].id, `ADMIN-${Date.now()}`, firstName, lastName, roles[0].id],
  );

  await client.query('COMMIT');
  console.log(`Admin account created for ${INITIAL_ADMIN_EMAIL}.`);
} catch (error) {
  await client.query('ROLLBACK').catch((rollbackError) => {
    console.error('Failed to roll back admin creation:', rollbackError);
  });
  console.error('Admin creation failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch((error) => {
    console.error('Failed to close the database connection:', error.message);
    process.exitCode = 1;
  });
}
