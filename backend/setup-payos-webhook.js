// setup-payos-webhook.js
// Script để đăng ký webhook URL với PayOS
import pkg from '@payos/node';
const { PayOS } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const API_KEY = process.env.PAYOS_API_KEY;
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

// Webhook URL - Dùng ngrok URL
const WEBHOOK_URL = process.argv[2];

if (!WEBHOOK_URL) {
  console.error('❌ Thiếu webhook URL!');
  console.log('');
  console.log('Cách dùng:');
  console.log('  node setup-payos-webhook.js <NGROK_URL>/api/v1/payments/payos/webhook');
  console.log('');
  console.log('Ví dụ:');
  console.log('  node setup-payos-webhook.js https://abc123.ngrok-free.app/api/v1/payments/payos/webhook');
  process.exit(1);
}

async function setupWebhook() {
  try {
    console.log('🔧 Đang setup PayOS webhook...');
    console.log('');
    console.log('Client ID:', CLIENT_ID);
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('');

    // Khởi tạo PayOS client
    const payos = new PayOS({
      clientId: CLIENT_ID,
      apiKey: API_KEY,
      checksumKey: CHECKSUM_KEY
    });

    console.log('✅ PayOS client initialized');

    // Confirm webhook URL
    console.log('📤 Đang gọi payos.webhooks.confirm()...');
    const result = await payos.webhooks.confirm(WEBHOOK_URL);

    console.log('');
    console.log('✅ ✅ ✅ WEBHOOK SETUP THÀNH CÔNG! ✅ ✅ ✅');
    console.log('');
    console.log('Kết quả:', result);
    console.log('');
    console.log('🎉 PayOS sẽ gửi webhook đến:', WEBHOOK_URL);
    console.log('');
    console.log('📝 Bước tiếp theo:');
    console.log('  1. Test thanh toán trên POS');
    console.log('  2. Quét QR hoặc mở trang thanh toán');
    console.log('  3. Sau khi thanh toán → Webhook tự động được gọi');
    console.log('  4. UI tự động cập nhật!');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ❌ ❌ LỖI SETUP WEBHOOK! ❌ ❌ ❌');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Chi tiết:', error);
    console.error('');
    console.error('💡 Kiểm tra:');
    console.error('  - Webhook URL có đúng không?');
    console.error('  - PayOS credentials có đúng không?');
    console.error('  - Ngrok có đang chạy không?');
    process.exit(1);
  }
}

setupWebhook();

