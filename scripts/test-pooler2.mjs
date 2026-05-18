import pg from 'pg';
const { Pool } = pg;

const pass = 'aHr5J4ObOtEyOzN3';
const ref = 'vuluayftrtbtnkpqsjfq';
const base = `aws-0-us-east-1.pooler.supabase.com`;

const urls = [
  // All combinations of user+db
  `postgresql://postgres.${ref}:${pass}@${base}:6543/postgres?pgbouncer=true`,
  `postgresql://postgres.${ref}:${pass}@${base}:6543/${ref}?pgbouncer=true`,
  `postgresql://postgres:${pass}@${base}:6543/postgres?pgbouncer=true`,
  `postgresql://postgres:${pass}@${base}:6543/${ref}?pgbouncer=true`,
  // Without pgbouncer flag
  `postgresql://postgres.${ref}:${pass}@${base}:6543/postgres`,
  // Session mode without pgbouncer flag
  `postgresql://postgres.${ref}:${pass}@${base}:5432/postgres`,
  
  // Try without any SSL
  `postgresql://postgres.${ref}:${pass}@${base}:6543/postgres?sslmode=disable`,
  
  // Transaction pooler port
  `postgresql://postgres.${ref}:${pass}@${base}:6579/postgres?pgbouncer=true`,
];

for (const url of urls) {
  try {
    const pool = new Pool({ 
      connectionString: url, 
      connectionTimeoutMillis: 5000,
      ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false }
    });
    await pool.query('SELECT 1');
    console.log('SUCCESS:', url.replace(pass, '***'));
    process.exit(0);
  } catch (e) {
    console.log('FAIL:', (e.message || '').slice(0, 100), '|', url.replace(pass, '***'));
  }
}
console.log('All failed');
process.exit(1);
