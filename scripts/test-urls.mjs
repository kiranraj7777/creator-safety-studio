import pg from 'pg';
const { Pool } = pg;

const pass = 'aHr5J4ObOtEyOzN3';
const ref = 'vuluayftrtbtnkpqsjfq';

const urls = [
  `postgresql://postgres:${pass}@${ref}.supabase.co:6543/postgres?pgbouncer=true`,
  `postgresql://postgres:${pass}@db.${ref}.supabase.co:6543/${ref}?pgbouncer=true`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/${ref}?pgbouncer=true`,
  `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
];

for (const url of urls) {
  try {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    await pool.query('SELECT 1');
    console.log('SUCCESS:', url.replace(pass, '***'));
    process.exit(0);
  } catch (e) {
    console.log('FAIL:', e.message.slice(0, 100), '|', url.replace(pass, '***'));
  }
}
console.log('All failed');
process.exit(1);
