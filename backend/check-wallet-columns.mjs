// check-wallet-columns.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function main() {
  try {
    const { rows } = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wallet_transactions'
      ORDER BY ordinal_position
    `);
    console.log('Columns in wallet_transactions:');
    rows.forEach(r => console.log('  -', r.column_name));
    
    // Kiểm tra xem có type hay transaction_type không
    const hasType = rows.some(r => r.column_name === 'type');
    const hasTransactionType = rows.some(r => r.column_name === 'transaction_type');
    console.log('\n✓ Has "type":', hasType);
    console.log('✓ Has "transaction_type":', hasTransactionType);

  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
