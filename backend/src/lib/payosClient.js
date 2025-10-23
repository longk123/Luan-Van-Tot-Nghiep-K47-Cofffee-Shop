// src/lib/payosClient.js
// PayOS Payment Gateway Client - Using Official SDK
import pkg from '@payos/node';
const { PayOS } = pkg;

const CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const API_KEY = process.env.PAYOS_API_KEY;
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

// Khởi tạo PayOS client với credentials từ .env (CÁCH ĐÚNG!)
let payOS = null;

try {
  payOS = new PayOS({
    clientId: CLIENT_ID,
    apiKey: API_KEY,
    checksumKey: CHECKSUM_KEY
  });
  console.log('✅ PayOS SDK initialized successfully with credentials');
} catch (err) {
  console.error('❌ Error initializing PayOS SDK:', err);
  payOS = null;
}

/**
 * Tạo payment order trên PayOS
 * @param {Object} params
 * @param {number} params.amount - Số tiền
 * @param {string} params.orderCode - Mã đơn hàng (unique)
 * @param {string} params.description - Mô tả
 * @param {string} params.returnUrl - URL redirect sau khi thanh toán
 * @param {string} params.cancelUrl - URL khi hủy
 * @returns {Promise<Object>} - Response từ PayOS
 */
export async function createPayOrder({ 
  amount, 
  orderCode, 
  description, 
  returnUrl, 
  cancelUrl 
}) {
  try {
    // Nếu PayOS SDK đã init, dùng PayOS thật
    if (payOS) {
      console.log('🔐 Using PayOS SDK (REAL)');
      
      const paymentData = {
        orderCode: Number(orderCode),
        amount: Number(amount),
        description: description || `Thanh toan don hang ${orderCode}`,
        // Redirect về React routes (không cần auth)
        returnUrl: returnUrl || `http://localhost:5173/payment-success?ref=${orderCode}`,
        cancelUrl: cancelUrl || `http://localhost:5173/payment-cancel?ref=${orderCode}`
      };

      console.log('📤 PayOS Request:', paymentData);

      // Gọi PayOS SDK - CÁCH ĐÚNG: paymentRequests.create()
      const response = await payOS.paymentRequests.create(paymentData);

      console.log('✅ PayOS Response (REAL):', response);

      // PayOS trả qrCode là raw data, cần convert thành image URL
      // Dùng VietQR.io để tạo QR image từ thông tin PayOS
      const qrImageUrl = `https://img.vietqr.io/image/${response.bin}-${response.accountNumber}-compact2.png?amount=${response.amount}&addInfo=${encodeURIComponent(response.description)}&accountName=${encodeURIComponent(response.accountName)}`;

      return {
        success: true,
        checkoutUrl: response.checkoutUrl,
        qrUrl: qrImageUrl, // QR image URL thay vì raw data
        qrCodeRaw: response.qrCode, // Giữ raw data nếu cần
        paymentLinkId: response.paymentLinkId,
        status: response.status,
        accountNumber: response.accountNumber,
        accountName: response.accountName,
        bin: response.bin,
        rawResponse: response
      };
    } else {
      console.log('⚠️ PayOS SDK not initialized - check credentials in .env');
    }

    // FALLBACK: Dùng VietQR demo (QR thật có thể quét được)
    console.log('⚠️ PayOS SDK not available - using VietQR demo');

    // Tạo VietQR code (QR thật)
    const bankId = '970422'; // MB Bank
    const accountNo = '0398869386';
    const accountName = 'COFFEE SHOP POS';
    const template = 'compact2';
    
    // VietQR.io API - free service tạo QR chuẩn VietQR
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(description || `HD${orderCode}`)}&accountName=${encodeURIComponent(accountName)}`;
    
    const checkoutUrl = returnUrl || `${process.env.APP_BASE_URL}/payment-success`;

    console.log('✅ VietQR Demo Created:', {
      qrUrl,
      amount,
      orderCode
    });

    return {
      success: true,
      checkoutUrl: checkoutUrl,
      qrUrl: qrUrl,
      paymentLinkId: orderCode,
      status: 'PENDING',
      rawResponse: {
        demo: true,
        qrUrl,
        checkoutUrl,
        bankId,
        accountNo,
        accountName
      }
    };
  } catch (error) {
    console.error('❌ Payment Error:', error);
    
    return {
      success: false,
      error: error.message || 'Cannot create payment',
      errorCode: error.code
    };
  }
}

/**
 * Kiểm tra trạng thái payment
 * @param {number} orderCode - Mã đơn hàng
 * @returns {Promise<Object>}
 */
export async function getPaymentStatus(orderCode) {
  try {
    if (!payOS) {
      console.warn('⚠️ PayOS SDK not initialized - cannot check real status');
      return {
        success: false,
        error: 'PayOS SDK not initialized',
        data: { demo: true }
      };
    }

    console.log('🔍 Calling PayOS API to get payment status for:', orderCode);

    // Cách đúng: paymentRequests.get()
    const response = await payOS.paymentRequests.get(Number(orderCode));

    console.log('📊 PayOS API returned:', response);

    return {
      success: true,
      status: response.status,
      data: response
    };
  } catch (error) {
    console.error('❌ PayOS getPaymentStatus Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Verify webhook signature từ PayOS
 * @param {Object} webhookData - Webhook data object
 * @returns {string} - Verification result
 */
export async function verifyWebhookSignature(webhookData) {
  try {
    if (!payOS) {
      // Demo mode - return webhook data as-is
      return webhookData;
    }
    
    // Cách đúng: webhooks.verify()
    const verifiedData = await payOS.webhooks.verify(webhookData);
    return verifiedData;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return null;
  }
}

/**
 * Hủy payment order
 * @param {number} orderCode
 * @param {string} reason - Lý do hủy
 * @returns {Promise<Object>}
 */
export async function cancelPayOrder(orderCode, reason = null) {
  try {
    if (!payOS) {
      return {
        success: true,
        data: { demo: true, cancelled: true }
      };
    }

    // Cách đúng: paymentRequests.cancel()
    const response = await payOS.paymentRequests.cancel(Number(orderCode), reason);

    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('❌ PayOS Cancel Error:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  createPayOrder,
  getPaymentStatus,
  verifyWebhookSignature,
  cancelPayOrder
};
