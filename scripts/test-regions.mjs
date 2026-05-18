import pg from 'pg';
const { Pool } = pg;
const regions = ['us-east-1','us-east-2','us-west-2','eu-west-1','eu-central-1','eu-west-2','eu-west-3','eu-north-1','eu-south-1','eu-south-2','ap-southeast-1','ap-southeast-2','ap-northeast-1','ap-northeast-2','ap-south-1','ap-south-2','sa-east-1','ca-central-1'];

async function test() {
  for (const region of regions) {
    try {
      const pool = new Pool({
        connectionString: `postgresql://postgres.vuluayftrtbtnkpqsjfq:aHr5J4ObOtEyOzN3@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`,
        connectionTimeoutMillis: 3000
      });
      await pool.query('SELECT 1');
      console.log('SUCCESS:', region);
      process.exit(0);
    } catch (e) {
      if (e.message.includes('connect ETIMEDOUT') || e.message.includes('getaddrinfo')) {
        // Skip - unreachable
      } else {
        console.log(`${region}: ${e.message}`);
      }
    }
  }
  console.log('Tried all regions, none worked');
  process.exit(1);
}
test();
