-- Fix payment method names - no Vietnamese characters
UPDATE payment_method SET name = 'QR VietQR' WHERE code = 'QR';
UPDATE payment_method SET name = 'Vi dien tu (MoMo/ZaloPay/ShopeePay)' WHERE code = 'WALLET';
UPDATE payment_method SET name = 'The ATM / Visa' WHERE code = 'CARD';
UPDATE payment_method SET name = 'Chuyen khoan ngan hang' WHERE code = 'TRANSFER';
UPDATE payment_method SET name = 'Tien mat' WHERE code = 'CASH';
UPDATE payment_method SET name = 'Ngan hang' WHERE code = 'BANK';

