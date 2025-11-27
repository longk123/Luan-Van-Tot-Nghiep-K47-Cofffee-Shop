// Kiểm tra khả năng refund cho các phương thức thanh toán khác nhau
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function check() {
  try {
    console.log('🔍 Kiểm tra khả năng refund cho các phương thức thanh toán...\n');
    console.log('='.repeat(60));
    
    // 1. Kiểm tra database schema
    console.log('📊 1. KIỂM TRA DATABASE SCHEMA:\n');
    
    const schemaCheck = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'order_payment_refund'
      ORDER BY ordinal_position
    `);
    
    console.log('   Bảng order_payment_refund:');
    schemaCheck.rows.forEach(col => {
      console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    const constraintCheck = await pool.query(`
      SELECT 
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'order_payment_refund'::regclass
    `);
    
    console.log('\n   Constraints:');
    if (constraintCheck.rows.length === 0) {
      console.log('     - Không có constraint đặc biệt');
    } else {
      constraintCheck.rows.forEach(con => {
        console.log(`     - ${con.constraint_name}: ${con.definition}`);
      });
    }
    
    // 2. Kiểm tra các payment methods có refund không
    console.log('\n📊 2. KIỂM TRA PAYMENT METHODS CÓ REFUND:\n');
    
    const refundStats = await pool.query(`
      SELECT 
        op.method_code,
        COUNT(DISTINCT op.id) AS total_payments,
        COUNT(DISTINCT r.id) AS total_refunds,
        COALESCE(SUM(r.amount), 0)::INT AS total_refunded_amount
      FROM order_payment op
      LEFT JOIN order_payment_refund r ON r.payment_id = op.id
      WHERE op.status = 'CAPTURED'
      GROUP BY op.method_code
      ORDER BY op.method_code
    `);
    
    console.log('   Thống kê refund theo phương thức:');
    refundStats.rows.forEach(stat => {
      const method = stat.method_code;
      const totalPayments = parseInt(stat.total_payments || 0);
      const totalRefunds = parseInt(stat.total_refunds || 0);
      const totalRefunded = parseInt(stat.total_refunded_amount || 0);
      
      console.log(`\n     ${method}:`);
      console.log(`       - Tổng payments: ${totalPayments}`);
      console.log(`       - Số lần refund: ${totalRefunds}`);
      console.log(`       - Tổng tiền refund: ${totalRefunded.toLocaleString('vi-VN')}đ`);
      console.log(`       - ${totalRefunds > 0 ? '✅' : '⚠️'} ${totalRefunds > 0 ? 'Đã có refund' : 'Chưa có refund'}`);
    });
    
    // 3. Kiểm tra code logic
    console.log('\n📊 3. PHÂN TÍCH CODE LOGIC:\n');
    
    console.log('   ✅ Hàm refundPayment trong paymentsController.js:');
    console.log('      - Chỉ kiểm tra: payment tồn tại, status = CAPTURED, số tiền hợp lệ');
    console.log('      - KHÔNG kiểm tra method_code');
    console.log('      - → Cho phép refund TẤT CẢ phương thức thanh toán\n');
    
    console.log('   ⚠️ VẤN ĐỀ THỰC TẾ:');
    console.log('      - CASH: ✅ Có thể refund (trả tiền mặt)');
    console.log('      - CARD/ATM: ⚠️ Cần hoàn tiền qua thẻ (chưa tích hợp payment gateway)');
    console.log('      - ONLINE (PayOS): ⚠️ Cần gọi PayOS API để refund (chưa implement)');
    console.log('      - TRANSFER: ⚠️ Cần chuyển khoản lại (chưa tích hợp)');
    
    // 4. Kiểm tra xem có payment nào đã refund chưa
    console.log('\n📊 4. KIỂM TRA PAYMENTS ĐÃ REFUND:\n');
    
    const refundedPayments = await pool.query(`
      SELECT 
        op.id,
        op.order_id,
        op.method_code,
        op.amount,
        op.status,
        COALESCE(SUM(r.amount), 0)::INT AS total_refunded,
        COUNT(r.id) AS refund_count
      FROM order_payment op
      LEFT JOIN order_payment_refund r ON r.payment_id = op.id
      WHERE op.status = 'CAPTURED'
        AND EXISTS (SELECT 1 FROM order_payment_refund WHERE payment_id = op.id)
      GROUP BY op.id, op.order_id, op.method_code, op.amount, op.status
      ORDER BY op.method_code, op.id
      LIMIT 10
    `);
    
    if (refundedPayments.rows.length > 0) {
      console.log(`   Tìm thấy ${refundedPayments.rows.length} payment đã refund:\n`);
      refundedPayments.rows.forEach(p => {
        console.log(`     Payment #${p.id} (Đơn #${p.order_id}):`);
        console.log(`       - Phương thức: ${p.method_code}`);
        console.log(`       - Số tiền: ${parseInt(p.amount).toLocaleString('vi-VN')}đ`);
        console.log(`       - Đã refund: ${p.total_refunded.toLocaleString('vi-VN')}đ (${p.refund_count} lần)`);
      });
    } else {
      console.log('   ⚠️ Chưa có payment nào được refund\n');
    }
    
    // 5. Kết luận
    console.log('='.repeat(60));
    console.log('📋 KẾT LUẬN:\n');
    console.log('   ✅ Hệ thống HIỆN TẠI cho phép refund TẤT CẢ phương thức thanh toán');
    console.log('   ⚠️ NHƯNG trong thực tế:');
    console.log('      - CASH: ✅ Hoạt động tốt');
    console.log('      - CARD/ATM: ⚠️ Chỉ ghi nhận refund trong DB, chưa hoàn tiền thực tế');
    console.log('      - ONLINE: ⚠️ Chỉ ghi nhận refund trong DB, chưa gọi PayOS API');
    console.log('      - TRANSFER: ⚠️ Chỉ ghi nhận refund trong DB, chưa chuyển khoản lại\n');
    
    console.log('   💡 KHUYẾN NGHỊ:');
    console.log('      1. Thêm validation: Chỉ cho phép refund CASH trong UI');
    console.log('      2. Hoặc tích hợp payment gateway để refund thực tế');
    console.log('      3. Hoặc thêm cảnh báo khi refund non-cash payments\n');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

check();

