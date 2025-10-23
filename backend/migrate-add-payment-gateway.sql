-- Migration: Thêm bảng payment_transaction và phương thức thanh toán PayOS
-- Ngày tạo: 2025-10-22
-- Mô tả: Tích hợp PayOS payment gateway

-- 1) Thêm các phương thức thanh toán (nếu chưa có)
INSERT INTO payment_method (code, "name", active, fee_fixed, fee_rate)
VALUES
  ('QR_BANK', 'QR Ngân hàng (VietQR)', true, 0, 0),
  ('CARD', 'Thẻ ATM / Visa', true, 0, 0),
  ('MOMO', 'Ví MoMo', true, 0, 0),
  ('ZALOPAY', 'Ví ZaloPay', true, 0, 0),
  ('VIETTELPAY', 'Ví ViettelPay', true, 0, 0),
  ('SHOPEEPAY', 'Ví ShopeePay', true, 0, 0),
  ('TRANSFER', 'Chuyển khoản', true, 0, 0),
  ('PAYOS', 'PayOS (Gateway)', true, 0, 0)
ON CONFLICT (code) DO NOTHING;

-- 2) Tạo bảng lưu chi tiết transaction với gateway
CREATE TABLE IF NOT EXISTS payment_transaction (
  id bigserial PRIMARY KEY,
  order_id int4 NULL REFERENCES don_hang(id) ON DELETE SET NULL,
  hoa_don_id int4 NULL REFERENCES don_hang(id),  -- hoặc tham chiếu hoa_don nếu có bảng riêng
  payment_method_code text NULL,
  ref_code varchar(128) NULL,         -- ref do hệ thống tạo (e.g. HD123-ABCD)
  gateway_txn_id varchar(256) NULL,   -- txn id từ gateway
  gateway_payload jsonb NULL,         -- lưu toàn bộ payload webhook (debug)
  amount bigint NOT NULL,
  currency varchar(12) DEFAULT 'VND',
  status varchar(32) DEFAULT 'PENDING', -- PENDING | PAID | FAILED | REFUNDED
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3) Tạo indexes
CREATE INDEX IF NOT EXISTS idx_payment_txn_ref ON payment_transaction(ref_code);
CREATE INDEX IF NOT EXISTS idx_payment_txn_order ON payment_transaction(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_txn_gateway_unique 
  ON payment_transaction(gateway_txn_id) 
  WHERE (gateway_txn_id IS NOT NULL);

-- 4) Thêm comment
COMMENT ON TABLE payment_transaction IS 'Lưu chi tiết giao dịch thanh toán qua payment gateway (PayOS, VNPay, etc.)';
COMMENT ON COLUMN payment_transaction.ref_code IS 'Mã tham chiếu do hệ thống tạo';
COMMENT ON COLUMN payment_transaction.gateway_txn_id IS 'Transaction ID từ gateway';
COMMENT ON COLUMN payment_transaction.gateway_payload IS 'Toàn bộ payload webhook từ gateway (JSON)';
COMMENT ON COLUMN payment_transaction.status IS 'PENDING, PAID, FAILED, REFUNDED';

