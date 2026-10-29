/**
 * seed-admin.js
 * Run with: node seed-admin.js
 * Creates an ADMIN user in the database if one doesn't exist.
 */

import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = 'admin@novox.com';
const ADMIN_PASSWORD = 'Admin@123';

async function seedAdmin() {
  console.log('🔍 Checking if admin user already exists...');

  const { data: existing } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (existing) {
    console.log(`✅ Admin user already exists:`);
    console.log(`   Email: ${existing.email}`);
    console.log(`   Role:  ${existing.role}`);
    console.log(`   ID:    ${existing.id}`);
    return;
  }

  console.log('➕ Creating admin user...');
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{
      email: ADMIN_EMAIL,
      password_hash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    }])
    .select('id, email, role, status')
    .single();

  if (error) {
    console.error('❌ Failed to create admin user:', error.message);
    process.exit(1);
  }

  console.log('✅ Admin user created successfully!');
  console.log(`   Email:    ${newUser.email}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Role:     ${newUser.role}`);
  console.log(`   ID:       ${newUser.id}`);
  console.log('\n⚠️  Remember to change the password after first login!');
}

seedAdmin().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
