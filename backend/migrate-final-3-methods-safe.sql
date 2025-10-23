-- Safe migration: 3 phuong thuc thanh toan
-- Giu lai du lieu cu, chi update/insert

-- 1. Deactivate cac method khong dung
UPDATE payment_method SET active = false 
WHERE code NOT IN ('CASH', 'ONLINE', 'CARD');

-- 2. Dam bao co 3 method chinh
INSERT INTO payment_method (code, name, active, fee_fixed, fee_rate)
VALUES
  ('CASH', 'Tien mat', true, 0, 0),
  ('ONLINE', 'Thanh toan online', true, 0, 0),
  ('CARD', 'The ATM/Visa', true, 0, 0)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  active = true;

