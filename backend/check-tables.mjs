// check-tables.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function showColumns(table) {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = $1 ORDER BY ordinal_position
  `, [table]);
  console.log(`\n${table}:`);
  console.log('  ' + rows.map(r => r.column_name).join(', '));
}

async function main() {
  await showColumns('order_payment');
  await showColumns('don_hang_delivery_info');
  await showColumns('don_hang_chi_tiet');
  await showColumns('don_hang');
  await showColumns('mon');
  await showColumns('loai_mon');
  await pool.end();
}

main();
