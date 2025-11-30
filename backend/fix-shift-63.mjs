// fix-shift-63.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', database: 'coffee_shop', user: 'postgres', password: '123456', port: 5432
});

async function main() {
  const r = await pool.query(`UPDATE ca_lam SET shift_type = 'WAITER' WHERE id = 63`);
  console.log('Updated shift 63:', r.rowCount);
  await pool.end();
}

main();
