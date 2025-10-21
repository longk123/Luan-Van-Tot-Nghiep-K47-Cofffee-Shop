// migrate-add-payments.cjs
// Migration: Thêm hệ thống thanh toán đa phương thức (multi-tender payments)
// Date: 2025-10-22

const { Pool } = require('pg');
require('dotenv').config();

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
    console.log('🚀 Bắt đầu migration: Hệ thống thanh toán...');
    
    await client.query('BEGIN');
    
    // 1. Extension (đã có từ reservations)
    console.log('📦 Đảm bảo extension btree_gist...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    
    // 2. Danh mục phương thức thanh toán
    console.log('💳 Tạo bảng payment_method...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_method (
        code        TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        active      BOOLEAN DEFAULT TRUE,
        fee_fixed   INT DEFAULT 0,
        fee_rate    NUMERIC(6,3) DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    await client.query(`
      INSERT INTO payment_method (code, name) VALUES
        ('CASH','Tiền mặt'),
        ('BANK','Chuyển khoản'),
        ('QR','Quét mã QR'),
        ('CARD','Thẻ')
      ON CONFLICT (code) DO NOTHING
    `);
    
    // 3. Bảng thanh toán theo đơn
    console.log('💰 Tạo bảng order_payment...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_payment (
        id            SERIAL PRIMARY KEY,
        order_id      INT NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
        method_code   TEXT NOT NULL REFERENCES payment_method(code),
        status        TEXT NOT NULL DEFAULT 'CAPTURED',
        amount        INT NOT NULL CHECK (amount >= 0),
        amount_tendered INT,
        change_given  INT DEFAULT 0,
        currency      TEXT DEFAULT 'VND',
        tx_ref        TEXT,
        note          TEXT,
        ca_lam_id     INT REFERENCES ca_lam(id),
        created_by    INT REFERENCES users(user_id),
        created_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // Drop constraint cũ nếu có
    await client.query(`
      ALTER TABLE IF EXISTS order_payment DROP CONSTRAINT IF EXISTS chk_order_payment_status;
    `);
    
    // 4. Constraint cho status
    console.log('✅ Thêm constraint...');
    await client.query(`
      ALTER TABLE order_payment
        ADD CONSTRAINT chk_order_payment_status
        CHECK (status IN ('PENDING','CAPTURED','VOIDED','REFUNDED'))
    `);
    
    // 5. Bảng refund
    console.log('🔄 Tạo bảng order_payment_refund...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_payment_refund (
        id             SERIAL PRIMARY KEY,
        payment_id     INT NOT NULL REFERENCES order_payment(id) ON DELETE CASCADE,
        amount         INT NOT NULL CHECK (amount > 0),
        reason         TEXT,
        created_by     INT REFERENCES users(user_id),
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // 6. View tổng thanh toán
    console.log('👁️ Tạo view v_order_payment_totals...');
    await client.query(`
      CREATE OR REPLACE VIEW v_order_payment_totals AS
      WITH pay AS (
        SELECT
          p.order_id,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status='CAPTURED'),0)::INT AS captured_amount,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status='VOIDED'),0)::INT   AS voided_amount
        FROM order_payment p
        GROUP BY p.order_id
      ),
      ref AS (
        SELECT
          op.order_id,
          COALESCE(SUM(r.amount),0)::INT AS refunded_amount
        FROM order_payment_refund r
        JOIN order_payment op ON op.id=r.payment_id
        GROUP BY op.order_id
      )
      SELECT
        o.id AS order_id,
        COALESCE(p.captured_amount,0) AS payments_captured,
        COALESCE(r.refunded_amount,0) AS payments_refunded,
        (COALESCE(p.captured_amount,0) - COALESCE(r.refunded_amount,0))::INT AS payments_net
      FROM don_hang o
      LEFT JOIN pay p ON p.order_id=o.id
      LEFT JOIN ref r ON r.order_id=o.id
    `);
    
    // 7a. Drop views dependency trước
    console.log('🗑️ Drop views để recreate...');
    await client.query(`DROP VIEW IF EXISTS v_order_settlement CASCADE`);
    await client.query(`DROP VIEW IF EXISTS v_order_money_totals CASCADE`);
    
    // 7a. Tạo view v_order_money_totals đơn giản (chỉ tính từ chi tiết đơn)
    console.log('💰 Tạo view v_order_money_totals...');
    await client.query(`
      CREATE VIEW v_order_money_totals AS
      SELECT
        o.id AS order_id,
        COALESCE(SUM((d.don_gia * d.so_luong)), 0)::INT AS subtotal_before_lines,
        COALESCE(SUM(COALESCE(d.giam_gia, 0)), 0)::INT AS line_discounts_total,
        COALESCE(SUM((d.don_gia * d.so_luong) - COALESCE(d.giam_gia, 0)), 0)::INT AS subtotal_after_lines,
        COALESCE(SUM(dhkm.so_tien_giam), 0)::INT AS promo_total,
        COALESCE(o.giam_gia_thu_cong, 0) AS manual_discount,
        0 AS service_fee,
        0.0 AS vat_rate,
        0 AS vat_amount,
        (COALESCE(SUM((d.don_gia * d.so_luong) - COALESCE(d.giam_gia, 0)), 0) - COALESCE(SUM(dhkm.so_tien_giam), 0) - COALESCE(o.giam_gia_thu_cong, 0))::INT AS grand_total
      FROM don_hang o
      LEFT JOIN don_hang_chi_tiet d ON d.don_hang_id = o.id
      LEFT JOIN don_hang_khuyen_mai dhkm ON dhkm.don_hang_id = o.id
      GROUP BY o.id, o.giam_gia_thu_cong
    `);
    
    // 7. View settlement (tổng tiền cuối + còn phải trả)
    console.log('📊 Tạo view v_order_settlement...');
    await client.query(`
      CREATE OR REPLACE VIEW v_order_settlement AS
      SELECT
        t.order_id,
        t.subtotal_after_lines,
        t.promo_total,
        t.manual_discount,
        t.service_fee,
        t.vat_rate,
        t.vat_amount,
        t.grand_total,
        COALESCE(p.payments_captured, 0) AS payments_captured,
        COALESCE(p.payments_refunded, 0) AS payments_refunded,
        COALESCE(p.payments_net, 0) AS payments_net,
        GREATEST(t.grand_total - COALESCE(p.payments_net,0), 0)::INT AS amount_due
      FROM v_order_money_totals t
      LEFT JOIN v_order_payment_totals p ON p.order_id = t.order_id
    `);
    
    // 8. Function: tiền còn phải trả
    console.log('🔧 Tạo function fn_order_amount_due...');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_order_amount_due(p_order_id INT)
      RETURNS INT AS $$
      DECLARE
        v_due INT;
      BEGIN
        SELECT amount_due INTO v_due FROM v_order_settlement WHERE order_id = p_order_id;
        RETURN COALESCE(v_due,0);
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    
    // 9. Trigger: tự tính change cho CASH
    console.log('⚙️ Tạo trigger tính change...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_order_payment_before_ins()
      RETURNS TRIGGER AS $$
      DECLARE
        v_due INT;
      BEGIN
        -- auto derive amount for CASH
        IF NEW.method_code = 'CASH' THEN
          IF NEW.amount IS NULL OR NEW.amount = 0 THEN
            IF NEW.amount_tendered IS NULL THEN
              RAISE EXCEPTION 'CASH yêu cầu amount hoặc amount_tendered';
            END IF;
            v_due := fn_order_amount_due(NEW.order_id);
            NEW.amount := LEAST(NEW.amount_tendered, v_due);
            NEW.change_given := GREATEST(NEW.amount_tendered - NEW.amount, 0);
          ELSE
            IF NEW.amount_tendered IS NOT NULL THEN
              NEW.change_given := GREATEST(NEW.amount_tendered - NEW.amount, 0);
            END IF;
          END IF;
        ELSE
          IF NEW.amount_tendered IS NOT NULL THEN
            RAISE EXCEPTION 'amount_tendered chỉ áp dụng cho CASH';
          END IF;
          IF NEW.change_given IS NOT NULL AND NEW.change_given <> 0 THEN
            RAISE EXCEPTION 'change_given chỉ áp dụng cho CASH';
          END IF;
        END IF;

        IF NEW.amount < 0 THEN
          RAISE EXCEPTION 'Số tiền không hợp lệ';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_order_payment_before_ins ON order_payment;
      CREATE TRIGGER t_order_payment_before_ins
      BEFORE INSERT ON order_payment
      FOR EACH ROW EXECUTE FUNCTION trg_order_payment_before_ins();
    `);
    
    // 10. Trigger: tự cập nhật trạng thái đơn sau thanh toán
    console.log('🔄 Tạo trigger auto-update order status...');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_sync_order_paid()
      RETURNS VOID AS $$
      DECLARE
        v_order_id INT;
        v_due INT;
      BEGIN
        IF TG_TABLE_NAME = 'order_payment' THEN
          v_order_id := COALESCE(NEW.order_id, OLD.order_id);
        ELSIF TG_TABLE_NAME = 'order_payment_refund' THEN
          SELECT order_id INTO v_order_id FROM order_payment WHERE id = COALESCE(NEW.payment_id, OLD.payment_id);
        END IF;

        IF v_order_id IS NULL THEN RETURN; END IF;

        v_due := fn_order_amount_due(v_order_id);
        IF v_due = 0 THEN
          UPDATE don_hang SET trang_thai='PAID', closed_at=COALESCE(closed_at, now()) 
          WHERE id=v_order_id AND trang_thai <> 'PAID';
        ELSE
          UPDATE don_hang SET trang_thai='OPEN', closed_at=NULL 
          WHERE id=v_order_id AND trang_thai='PAID';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_after_payment_change()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM fn_sync_order_paid();
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_after_pay_iud ON order_payment;
      CREATE TRIGGER t_after_pay_iud
      AFTER INSERT OR UPDATE OR DELETE ON order_payment
      FOR EACH ROW EXECUTE FUNCTION trg_after_payment_change();
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_after_refund_iud ON order_payment_refund;
      CREATE TRIGGER t_after_refund_iud
      AFTER INSERT OR UPDATE OR DELETE ON order_payment_refund
      FOR EACH ROW EXECUTE FUNCTION trg_after_payment_change();
    `);
    
    // 11. Indexes
    console.log('⚡ Tạo indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_payment_order ON order_payment(order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_payment_status ON order_payment(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_payment_method ON order_payment(method_code)`);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration hoàn tất!');
    console.log('');
    console.log('📋 Đã tạo:');
    console.log('  - Bảng: payment_method, order_payment, order_payment_refund');
    console.log('  - Function: fn_order_amount_due(), fn_sync_order_paid()');
    console.log('  - View: v_order_payment_totals, v_order_settlement');
    console.log('  - Trigger: Auto-calculate change, Auto-update order status');
    console.log('  - Payment methods: CASH, BANK, QR, CARD');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

