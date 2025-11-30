/**
 * Fix wallet balance - Tính lại balance từ transactions
 */
import { pool } from './src/db.js';

async function fix() {
  console.log('📊 Checking current state...\n');
  
  // Tính balance đúng từ transactions
  const result = await pool.query(`
    WITH calc AS (
      SELECT 
        wallet_id,
        SUM(CASE WHEN type = 'COLLECT' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN type = 'SETTLE' THEN amount ELSE 0 END) as total_settled,
        SUM(CASE WHEN type = 'COLLECT' THEN amount WHEN type = 'SETTLE' THEN -amount ELSE amount END) as correct_balance
      FROM wallet_transactions
      GROUP BY wallet_id
    )
    SELECT w.id, w.user_id, w.balance as current_balance, 
           COALESCE(c.correct_balance, 0) as correct_balance,
           COALESCE(c.total_collected, 0) as calc_collected,
           COALESCE(c.total_settled, 0) as calc_settled,
           w.total_collected as stored_collected,
           w.total_settled as stored_settled
    FROM shipper_wallet w
    LEFT JOIN calc c ON c.wallet_id = w.id
  `);
  console.log('Current state:');
  console.table(result.rows);
  
  // Check if any needs fix
  const needsFix = result.rows.filter(r => 
    Number(r.current_balance) !== Number(r.correct_balance)
  );
  
  if (needsFix.length === 0) {
    console.log('\n✅ All wallet balances are correct!');
    await pool.end();
    return;
  }
  
  console.log(`\n⚠️ Found ${needsFix.length} wallets with incorrect balance. Fixing...`);
  
  // Update balance from transactions
  const updateResult = await pool.query(`
    WITH calc AS (
      SELECT 
        wallet_id,
        SUM(CASE WHEN type = 'COLLECT' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN type = 'SETTLE' THEN amount ELSE 0 END) as total_settled,
        SUM(CASE WHEN type = 'COLLECT' THEN amount WHEN type = 'SETTLE' THEN -amount ELSE amount END) as correct_balance
      FROM wallet_transactions
      GROUP BY wallet_id
    )
    UPDATE shipper_wallet w
    SET 
      balance = COALESCE(c.correct_balance, 0),
      total_collected = COALESCE(c.total_collected, 0),
      total_settled = COALESCE(c.total_settled, 0)
    FROM calc c
    WHERE w.id = c.wallet_id
    RETURNING w.id, w.user_id, w.balance, w.total_collected, w.total_settled
  `);
  
  console.log('\n✅ Fixed wallets:');
  console.table(updateResult.rows);
  
  await pool.end();
}

fix().catch(console.error);
