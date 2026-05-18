import pg from 'pg';
const { Pool } = pg;

const ref = 'vuluayftrtbtnkpqsjfq';
const pass = 'aHr5J4ObOtEyOzN3';
const attempts = [
  // Pooler with ref in username
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  `postgresql://postgres.${ref}:${pass}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  // Without ref in username (just postgres)
  `postgresql://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/${ref}?pgbouncer=true`,
  `postgresql://postgres:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  // Session pooler
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  // With sslmode
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`,
  // Transaction pooler port
  `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6579/postgres?pgbouncer=true`,
];

for (const url of attempts) {
  try {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    await pool.query('SELECT 1');
    console.log(`SUCCESS: ${url}`);
    process.exit(0);
  } catch (e) {
    const shortUrl = url.replace(pass, '***');
    console.log(`FAIL: ${e.message.slice(0, 80)} | ${shortUrl}`);
  }
}
console.log('All failed');
process.exit(1);
