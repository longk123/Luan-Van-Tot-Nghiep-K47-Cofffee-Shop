// Check database timezone settings
import { pool } from './src/db.js';

async function checkTimezone() {
  try {
    // Check database timezone
    const { rows: tzRows } = await pool.query(`SHOW timezone`);
    console.log('🌍 Database timezone:', tzRows[0].TimeZone);
    
    // Check current time in different formats
    const { rows: timeRows } = await pool.query(`
      SELECT 
        NOW() AS now_default,
        NOW() AT TIME ZONE 'UTC' AS now_utc,
        NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' AS now_vn,
        CURRENT_TIMESTAMP AS current_timestamp,
        LOCALTIMESTAMP AS local_timestamp
    `);
    
    console.log('\n⏰ Current time:');
    console.log('NOW():', timeRows[0].now_default);
    console.log('NOW() AT TIME ZONE UTC:', timeRows[0].now_utc);
    console.log('NOW() AT TIME ZONE Asia/Ho_Chi_Minh:', timeRows[0].now_vn);
    console.log('CURRENT_TIMESTAMP:', timeRows[0].current_timestamp);
    console.log('LOCALTIMESTAMP:', timeRows[0].local_timestamp);
    
    // Check a specific order's closed_at
    const { rows: orderRows } = await pool.query(`
      SELECT 
        id,
        closed_at,
        closed_at AT TIME ZONE 'UTC' AS closed_at_as_utc,
        closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh' AS closed_at_as_vn,
        to_char(closed_at, 'YYYY-MM-DD HH24:MI:SS TZ') AS closed_at_formatted,
        to_char((closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_vn_formatted
      FROM don_hang
      WHERE id = 227
    `);
    
    console.log('\n📋 Đơn #227:');
    console.log('closed_at (raw):', orderRows[0].closed_at);
    console.log('closed_at AT TIME ZONE UTC:', orderRows[0].closed_at_as_utc);
    console.log('closed_at AT TIME ZONE Asia/Ho_Chi_Minh:', orderRows[0].closed_at_as_vn);
    console.log('closed_at formatted:', orderRows[0].closed_at_formatted);
    console.log('closed_at VN formatted:', orderRows[0].closed_at_vn_formatted);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkTimezone();

