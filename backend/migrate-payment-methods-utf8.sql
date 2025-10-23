-- Cập nhật tên phương thức thanh toán có dấu
UPDATE payment_method SET name = 'Tiền mặt' WHERE code = 'CASH';
UPDATE payment_method SET name = 'Chuyển khoản' WHERE code = 'TRANSFER';
UPDATE payment_method SET name = 'Ví điện tử (MoMo/ZaloPay/ShopeePay)' WHERE code = 'WALLET';
UPDATE payment_method SET name = 'Thẻ ATM/Visa' WHERE code = 'CARD';

