// Script kiểm tra view v_invoice_header
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function checkView() {
  try {
    // Kiểm tra các cột trong view
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'v_invoice_header' 
      AND column_name IN ('nguoi_tao_don', 'thu_ngan', 'nguoi_tao_don_username', 'thu_ngan_username')
      ORDER BY column_name
    `);
    
    console.log('📋 Các cột trong v_invoice_header:');
    columns.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });
    
    // Kiểm tra đơn #286
    const order286 = await pool.query(`
      SELECT 
        dh.id,
        dh.nhan_vien_id,
        u_creator.full_name AS nguoi_tao_don,
        header.nguoi_tao_don AS header_nguoi_tao_don,
        header.thu_ngan AS header_thu_ngan
      FROM don_hang dh
      LEFT JOIN users u_creator ON u_creator.user_id = dh.nhan_vien_id
      LEFT JOIN v_invoice_header header ON header.order_id = dh.id
      WHERE dh.id = 286
    `);
    
    if (order286.rows.length > 0) {
      console.log('\n📦 Thông tin đơn #286:');
      const order = order286.rows[0];
      console.log(`  - nhan_vien_id: ${order.nhan_vien_id}`);
      console.log(`  - Người tạo đơn (từ users): ${order.nguoi_tao_don}`);
      console.log(`  - Người tạo đơn (từ view): ${order.header_nguoi_tao_don || 'NULL'}`);
      console.log(`  - Thu ngân (từ view): ${order.header_thu_ngan || 'NULL'}`);
    } else {
      console.log('\n❌ Không tìm thấy đơn #286');
    }
    
    // Kiểm tra payment của đơn #286
    const payments = await pool.query(`
      SELECT 
        op.id,
        op.created_by,
        u.full_name AS payer_name,
        op.created_at
      FROM order_payment op
      LEFT JOIN users u ON u.user_id = op.created_by
      WHERE op.order_id = 286
      ORDER BY op.created_at ASC
      LIMIT 1
    `);
    
    if (payments.rows.length > 0) {
      console.log('\n💳 Payment đầu tiên của đơn #286:');
      const payment = payments.rows[0];
      console.log(`  - created_by: ${payment.created_by}`);
      console.log(`  - Người thanh toán: ${payment.payer_name}`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

checkView();

