-- Final: Chi 3 phuong thuc thanh toan
-- 1. Tien mat (CASH)
-- 2. Thanh toan online (ONLINE - PayOS gateway)
-- 3. The ATM/Visa (CARD)

-- Xoa tat ca
DELETE FROM payment_method;

-- Them 3 phuong thuc chinh
INSERT INTO payment_method (code, name, active, fee_fixed, fee_rate)
VALUES
  ('CASH', 'Tien mat', true, 0, 0),
  ('ONLINE', 'Thanh toan online', true, 0, 0),
  ('CARD', 'The ATM/Visa', true, 0, 0);

