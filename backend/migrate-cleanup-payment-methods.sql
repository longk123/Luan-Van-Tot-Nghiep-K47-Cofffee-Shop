-- Cleanup: Chi giu lai 4 phuong thuc thanh toan
-- 1. Tien mat (CASH)
-- 2. Chuyen khoan (TRANSFER)
-- 3. Vi dien tu (WALLET - MoMo/ZaloPay/ShopeePay)
-- 4. The ATM/Visa (CARD)

-- Xoa tat ca cac phuong thuc khac
DELETE FROM payment_method WHERE code NOT IN ('CASH', 'TRANSFER', 'WALLET', 'CARD');

-- Cap nhat lai ten cho 4 phuong thuc chinh
UPDATE payment_method SET name = 'Tien mat' WHERE code = 'CASH';
UPDATE payment_method SET name = 'Chuyen khoan' WHERE code = 'TRANSFER';
UPDATE payment_method SET name = 'Vi dien tu (MoMo/ZaloPay/ShopeePay)' WHERE code = 'WALLET';
UPDATE payment_method SET name = 'The ATM/Visa' WHERE code = 'CARD';

-- Dam bao tat ca deu active
UPDATE payment_method SET active = true WHERE code IN ('CASH', 'TRANSFER', 'WALLET', 'CARD');

