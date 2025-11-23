// backend/seed-admin-data.cjs
// Script để tạo dữ liệu mẫu cho Admin

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffeepos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedAdminData() {
  const client = await pool.connect();
  try {
    console.log('🚀 Bắt đầu tạo dữ liệu mẫu cho Admin...\n');

    await client.query('BEGIN');

    // 1. Tạo user Admin
    console.log('👤 Tạo user Admin...');
    
    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await client.query(`
      SELECT user_id FROM users WHERE username = 'admin'
    `);

    let adminUserId;
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  User admin đã tồn tại, cập nhật thông tin...');
      adminUserId = existingAdmin.rows[0].user_id;
      
      // Hash password
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      // Cập nhật thông tin admin
      await client.query(`
        UPDATE users 
        SET 
          password_hash = $1,
          full_name = 'Quản trị viên',
          email = 'admin@coffeeshop.com',
          phone = '0901234567',
          is_active = true
        WHERE user_id = $2
      `, [passwordHash, adminUserId]);
      
      console.log('✅ Đã cập nhật user admin');
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      // Tạo user admin mới
      const result = await client.query(`
        INSERT INTO users (username, password_hash, full_name, email, phone, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING user_id
      `, [
        'admin',
        passwordHash,
        'Quản trị viên',
        'admin@coffeeshop.com',
        '0901234567',
        true
      ]);
      
      adminUserId = result.rows[0].user_id;
      console.log('✅ Đã tạo user admin mới');
    }

    // 2. Gán role Admin cho user
    console.log('🔐 Gán role Admin...');
    
    // Lấy role_id của admin
    const adminRole = await client.query(`
      SELECT role_id FROM roles WHERE role_name = 'admin'
    `);
    
    if (adminRole.rows.length === 0) {
      throw new Error('Role "admin" không tồn tại trong database!');
    }
    
    const adminRoleId = adminRole.rows[0].role_id;
    
    // Xóa các role cũ (nếu có)
    await client.query(`
      DELETE FROM user_roles WHERE user_id = $1
    `, [adminUserId]);
    
    // Gán role admin
    await client.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [adminUserId, adminRoleId]);
    
    console.log('✅ Đã gán role Admin');

    // 3. Tạo System Settings mẫu
    console.log('⚙️  Tạo System Settings mẫu...');
    
    const defaultSettings = {
      // General
      store_name: 'Coffee Shop',
      store_address: '123 Đường ABC, Quận XYZ, TP.HCM',
      store_phone: '0901234567',
      store_email: 'contact@coffeeshop.com',
      
      // Business
      opening_hours: '07:00',
      closing_hours: '22:00',
      timezone: 'Asia/Ho_Chi_Minh',
      currency: 'VND',
      vat_rate: 10,
      
      // POS
      allow_order_cancellation: true,
      allow_price_edit: false,
      auto_print_invoice: false,
      
      // Security
      session_timeout: 30,
      password_min_length: 6,
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      await client.query(`
        INSERT INTO system_settings (key, value, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, valueStr]);
    }
    
    console.log('✅ Đã tạo System Settings mẫu');

    // 4. Tạo System Logs mẫu
    console.log('📝 Tạo System Logs mẫu...');
    
    const sampleLogs = [
      {
        level: 'INFO',
        user_id: adminUserId,
        action: 'SYSTEM_START',
        message: 'Hệ thống đã khởi động thành công',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 86400000) // 1 ngày trước
      },
      {
        level: 'INFO',
        user_id: adminUserId,
        action: 'USER_LOGIN',
        message: 'Admin đăng nhập thành công',
        ip_address: '192.168.1.100',
        created_at: new Date(Date.now() - 3600000) // 1 giờ trước
      },
      {
        level: 'INFO',
        user_id: adminUserId,
        action: 'SETTINGS_UPDATE',
        message: 'Cập nhật cấu hình hệ thống',
        ip_address: '192.168.1.100',
        created_at: new Date(Date.now() - 1800000) // 30 phút trước
      },
      {
        level: 'WARN',
        user_id: null,
        action: 'LOW_STOCK',
        message: 'Nguyên liệu cà phê sắp hết (còn 5kg)',
        ip_address: null,
        created_at: new Date(Date.now() - 7200000) // 2 giờ trước
      },
      {
        level: 'ERROR',
        user_id: null,
        action: 'PAYMENT_FAILED',
        message: 'Thanh toán thất bại: Connection timeout',
        ip_address: null,
        created_at: new Date(Date.now() - 10800000) // 3 giờ trước
      },
      {
        level: 'INFO',
        user_id: adminUserId,
        action: 'USER_CREATE',
        message: 'Tạo user mới: cashier1',
        ip_address: '192.168.1.100',
        created_at: new Date(Date.now() - 14400000) // 4 giờ trước
      },
    ];

    for (const log of sampleLogs) {
      await client.query(`
        INSERT INTO system_logs (level, user_id, action, message, ip_address, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        log.level,
        log.user_id,
        log.action,
        log.message,
        log.ip_address,
        log.created_at
      ]);
    }
    
    console.log('✅ Đã tạo System Logs mẫu');

    await client.query('COMMIT');
    
    console.log('\n✅ Hoàn tất tạo dữ liệu mẫu cho Admin!');
    console.log('\n📋 Thông tin đăng nhập Admin:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@coffeeshop.com');
    console.log('\n⚠️  Lưu ý: Vui lòng đổi mật khẩu sau khi đăng nhập!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi khi tạo dữ liệu mẫu:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdminData().catch(console.error);

