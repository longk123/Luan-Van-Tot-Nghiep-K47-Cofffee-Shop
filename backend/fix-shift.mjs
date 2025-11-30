import pg from 'pg';
const pool = new pg.Pool({host:'localhost',port:5432,database:'coffee_shop',user:'postgres',password:'123456'});

// 1. Kiểm tra và sửa shift_type của waiter
const shifts = await pool.query("SELECT id,nhan_vien_id,shift_type,status FROM ca_lam WHERE status='OPEN'");
console.log('📋 CA ĐANG MỞ:');
console.table(shifts.rows);

// Sửa waiter shift_type nếu cần
const fix = await pool.query("UPDATE ca_lam SET shift_type='WAITER' WHERE nhan_vien_id=6 AND status='OPEN' AND shift_type!='WAITER' RETURNING *");
if(fix.rowCount > 0) console.log('✅ Đã sửa shift_type của waiter:', fix.rowCount);

// 2. Kiểm tra lại
const after = await pool.query("SELECT id,nhan_vien_id,shift_type,status FROM ca_lam WHERE status='OPEN'");
console.log('\n📋 SAU KHI SỬA:');
console.table(after.rows);

await pool.end();
