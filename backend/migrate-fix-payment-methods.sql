-- Migration: Sửa lại phương thức thanh toán - gộp ví điện tử
-- Ngày: 2025-10-22
-- Mô tả: Xóa các ví riêng lẻ, tạo 1 phương thức "Ví điện tử" chung

-- 1) Xóa các phương thức ví riêng lẻ (nếu có)
DELETE FROM payment_method WHERE code IN ('MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY', 'PAYOS');

-- 2) Xóa các phương thức trùng lặp
DELETE FROM payment_method WHERE code IN ('QR_BANK', 'CARD', 'TRANSFER');

-- 3) Thêm lại các phương thức thanh toán hợp lý
INSERT INTO payment_method (code, "name", active, fee_fixed, fee_rate)
VALUES
  ('QR', 'QR VietQR', true, 0, 0),
  ('WALLET', 'Ví điện tử (MoMo/ZaloPay/ShopeePay)', true, 0, 0),
  ('CARD', 'Thẻ ATM / Visa', true, 0, 0),
  ('TRANSFER', 'Chuyển khoản ngân hàng', true, 0, 0)
ON CONFLICT (code) DO UPDATE SET
  "name" = EXCLUDED."name",
  active = EXCLUDED.active;

-- 4) Đảm bảo CASH và BANK vẫn có (nếu chưa)
INSERT INTO payment_method (code, "name", active, fee_fixed, fee_rate)
VALUES
  ('CASH', 'Tiền mặt', true, 0, 0),
  ('BANK', 'Ngân hàng', true, 0, 0)
ON CONFLICT (code) DO NOTHING;

-- 5) Comment
COMMENT ON COLUMN payment_method.code IS 'CASH, BANK, QR, WALLET, CARD, TRANSFER';

