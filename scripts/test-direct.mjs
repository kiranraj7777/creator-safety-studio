import pg from 'pg';
const { Pool } = pg;

async function test(url, label) {
  try {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
    await pool.query('SELECT 1');
    console.log(`SUCCESS: ${label}`);
    process.exit(0);
  } catch (e) {
    console.log(`FAIL ${label}: ${e.message.slice(0, 100)}`);
  }
}

// Try different formats
await test(
  'postgresql://postgres:aHr5J4ObOtEyOzN3@db.vuluayftrtbtnkpqsjfq.supabase.co:5432/postgres',
  'direct-5432'
);
await test(
  'postgresql://postgres:aHr5J4ObOtEyOzN3@db.vuluayftrtbtnkpqsjfq.supabase.co:6543/postgres?pgbouncer=true',
  'direct-6543-without-ref'
);
await test(
  'postgresql://postgres.vuluayftrtbtnkpqsjfq:aHr5J4ObOtEyOzN3@db.vuluayftrtbtnkpqsjfq.supabase.co:5432/postgres',
  'direct-with-ref-in-user'
);

console.log('All failed');
process.exit(1);
