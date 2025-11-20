// Migration script for Customer Portal
// Run: node backend/migrate-customer-portal.cjs

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Starting Customer Portal migration...\n');
    
    // =========================================================
    // 1. CREATE TABLE: customer_accounts
    // =========================================================
    console.log('📝 Creating table: customer_accounts...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_accounts (
        id SERIAL PRIMARY KEY,
        phone TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        date_of_birth DATE,
        gender TEXT CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        loyalty_points INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_accounts_phone 
      ON customer_accounts(phone)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_accounts_email 
      ON customer_accounts(email)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_accounts_active 
      ON customer_accounts(is_active) WHERE is_active = TRUE
    `);
    
    console.log('✅ Table customer_accounts created\n');
    
    // =========================================================
    // 2. CREATE TABLE: customer_cart
    // =========================================================
    console.log('📝 Creating table: customer_cart...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_cart (
        id SERIAL PRIMARY KEY,
        customer_account_id INT REFERENCES customer_accounts(id) ON DELETE CASCADE,
        session_id TEXT,
        items JSONB NOT NULL DEFAULT '[]',
        promo_code TEXT,
        promo_discount INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        CONSTRAINT check_cart_owner CHECK (
          (customer_account_id IS NOT NULL AND session_id IS NULL) OR
          (customer_account_id IS NULL AND session_id IS NOT NULL)
        )
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_cart_account 
      ON customer_cart(customer_account_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_cart_session 
      ON customer_cart(session_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_cart_expires 
      ON customer_cart(expires_at)
    `);
    
    console.log('✅ Table customer_cart created\n');
    
    // =========================================================
    // 3. UPDATE TABLE: don_hang (add customer portal fields)
    // =========================================================
    console.log('📝 Updating table: don_hang...');
    
    // Add order_source column
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'POS' 
      CHECK (order_source IN ('POS', 'ONLINE', 'PHONE'))
    `);
    
    // Add customer_account_id column
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS customer_account_id INT 
      REFERENCES customer_accounts(id) ON DELETE SET NULL
    `);
    
    // Add delivery fields for online orders
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS delivery_address TEXT
    `);
    
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS delivery_phone TEXT
    `);
    
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ
    `);
    
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS delivery_notes TEXT
    `);
    
    // Add customer notes
    await client.query(`
      ALTER TABLE don_hang 
      ADD COLUMN IF NOT EXISTS customer_notes TEXT
    `);
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_don_hang_customer 
      ON don_hang(customer_account_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_don_hang_source 
      ON don_hang(order_source)
    `);
    
    console.log('✅ Table don_hang updated\n');
    
    // =========================================================
    // 4. UPDATE TABLE: dat_ban (link to customer accounts)
    // =========================================================
    console.log('📝 Updating table: dat_ban...');
    
    await client.query(`
      ALTER TABLE dat_ban 
      ADD COLUMN IF NOT EXISTS customer_account_id INT 
      REFERENCES customer_accounts(id) ON DELETE SET NULL
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dat_ban_customer 
      ON dat_ban(customer_account_id)
    `);
    
    console.log('✅ Table dat_ban updated\n');
    
    // =========================================================
    // 5. CREATE TRIGGER: Update updated_at automatically
    // =========================================================
    console.log('📝 Creating triggers...');
    
    // Trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    // Trigger for customer_accounts
    await client.query(`
      DROP TRIGGER IF EXISTS update_customer_accounts_updated_at ON customer_accounts
    `);
    
    await client.query(`
      CREATE TRIGGER update_customer_accounts_updated_at
      BEFORE UPDATE ON customer_accounts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    
    // Trigger for customer_cart
    await client.query(`
      DROP TRIGGER IF EXISTS update_customer_cart_updated_at ON customer_cart
    `);
    
    await client.query(`
      CREATE TRIGGER update_customer_cart_updated_at
      BEFORE UPDATE ON customer_cart
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    
    console.log('✅ Triggers created\n');
    
    // =========================================================
    // 6. CREATE VIEW: v_customer_orders
    // =========================================================
    console.log('📝 Creating view: v_customer_orders...');
    
    await client.query(`
      CREATE OR REPLACE VIEW v_customer_orders AS
      SELECT 
        o.id,
        o.customer_account_id,
        o.order_type,
        o.order_source,
        o.trang_thai,
        o.opened_at,
        o.closed_at,
        o.delivery_address,
        o.delivery_phone,
        o.delivery_time,
        o.customer_notes,
        ca.full_name AS customer_name,
        ca.phone AS customer_phone,
        ca.email AS customer_email,
        b.ten_ban AS table_name,
        b.khu_vuc AS table_area,
        COUNT(DISTINCT oc.id) AS item_count,
        COALESCE(SUM(oc.so_luong * oc.don_gia), 0) AS subtotal,
        COALESCE(SUM(okt.so_tien_giam), 0) AS discount_amount,
        COALESCE(SUM(oc.so_luong * oc.don_gia), 0) - COALESCE(SUM(okt.so_tien_giam), 0) AS total
      FROM don_hang o
      LEFT JOIN customer_accounts ca ON ca.id = o.customer_account_id
      LEFT JOIN ban b ON b.id = o.ban_id
      LEFT JOIN don_hang_chi_tiet oc ON oc.don_hang_id = o.id
      LEFT JOIN don_hang_khuyen_mai okt ON okt.don_hang_id = o.id
      WHERE o.order_source = 'ONLINE'
      GROUP BY 
        o.id, o.customer_account_id, o.order_type, o.order_source,
        o.trang_thai, o.opened_at, o.closed_at, o.delivery_address,
        o.delivery_phone, o.delivery_time, o.customer_notes,
        ca.full_name, ca.phone, ca.email, b.ten_ban, b.khu_vuc
    `);
    
    console.log('✅ View v_customer_orders created\n');
    
    // =========================================================
    // 7. CREATE VIEW: v_customer_reservations
    // =========================================================
    console.log('📝 Creating view: v_customer_reservations...');
    
    await client.query(`
      CREATE OR REPLACE VIEW v_customer_reservations AS
      SELECT 
        r.id,
        r.customer_account_id,
        r.ten_khach AS customer_name,
        r.so_dien_thoai AS customer_phone,
        r.so_nguoi AS party_size,
        r.start_at,
        r.end_at,
        r.trang_thai AS status,
        r.ghi_chu AS notes,
        r.dat_coc AS deposit,
        r.dat_coc_trang_thai AS deposit_status,
        ca.full_name AS account_name,
        ca.email AS account_email,
        kv.ten AS area_name,
        COALESCE(
          (SELECT json_agg(json_build_object('id', b.id, 'name', b.ten_ban))
           FROM dat_ban_ban dbb
           JOIN ban b ON b.id = dbb.ban_id
           WHERE dbb.dat_ban_id = r.id),
          '[]'::json
        ) AS tables,
        r.created_at,
        r.updated_at
      FROM dat_ban r
      LEFT JOIN customer_accounts ca ON ca.id = r.customer_account_id
      LEFT JOIN khu_vuc kv ON kv.id = r.khu_vuc_id
      ORDER BY r.start_at DESC
    `);
    
    console.log('✅ View v_customer_reservations created\n');
    
    // =========================================================
    // 8. CREATE FUNCTION: Clean expired carts
    // =========================================================
    console.log('📝 Creating function: clean_expired_carts...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION clean_expired_carts()
      RETURNS void AS $$
      BEGIN
        DELETE FROM customer_cart
        WHERE expires_at < NOW();
      END;
      $$ LANGUAGE plpgsql
    `);
    
    console.log('✅ Function clean_expired_carts created\n');
    
    // =========================================================
    // 9. INSERT SAMPLE DATA (for testing)
    // =========================================================
    console.log('📝 Inserting sample customer account...');
    
    // Check if sample exists
    const existingSample = await client.query(`
      SELECT id FROM customer_accounts WHERE phone = '0987654321'
    `);
    
    if (existingSample.rows.length === 0) {
      // Password: customer123 (hashed with bcrypt)
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('customer123', 10);
      
      await client.query(`
        INSERT INTO customer_accounts (
          phone, email, password_hash, full_name, is_active
        ) VALUES (
          '0987654321',
          'customer@example.com',
          $1,
          'Khách Hàng Mẫu',
          TRUE
        )
      `, [hashedPassword]);
      
      console.log('✅ Sample customer account created');
      console.log('   📱 Phone: 0987654321');
      console.log('   🔑 Password: customer123\n');
    } else {
      console.log('ℹ️  Sample customer account already exists\n');
    }
    
    // =========================================================
    // COMMIT
    // =========================================================
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!\n');
    
    console.log('📊 Summary:');
    console.log('   ✅ Created table: customer_accounts');
    console.log('   ✅ Created table: customer_cart');
    console.log('   ✅ Updated table: don_hang');
    console.log('   ✅ Updated table: dat_ban');
    console.log('   ✅ Created triggers for updated_at');
    console.log('   ✅ Created view: v_customer_orders');
    console.log('   ✅ Created view: v_customer_reservations');
    console.log('   ✅ Created function: clean_expired_carts');
    console.log('   ✅ Inserted sample customer account\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => {
    console.log('🎉 Customer Portal database migration complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Migration error:', err);
    process.exit(1);
  });

