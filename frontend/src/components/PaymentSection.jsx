// src/components/PaymentSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function PaymentSection({ orderId, onPaymentComplete, onShowToast }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [payments, setPayments] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [txRef, setTxRef] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    loadSettlement();
  }, [orderId]);

  const loadPaymentMethods = async () => {
    try {
      const res = await api.getPaymentMethods();
      setPaymentMethods(res?.data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const loadSettlement = async () => {
    if (!orderId) return;
    try {
      const res = await api.getOrderSettlement(orderId);
      const data = res?.data || {};
      setSettlement(data.settlement);
      setPayments(data.payments || []);
      
      // Auto-fill amount = amount_due
      const due = data.settlement?.amount_due || 0;
      setAmount(due > 0 ? due.toString() : '');
    } catch (error) {
      console.error('Error loading settlement:', error);
    }
  };

  const handlePay = async () => {
    const amountNum = parseInt(amount);
    const tenderedNum = selectedMethod === 'CASH' ? parseInt(amountTendered) || 0 : null;

    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Số tiền không hợp lệ',
        message: 'Vui lòng nhập số tiền hợp lệ'
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        method_code: selectedMethod,
        amount: amountNum,
        amount_tendered: tenderedNum,
        tx_ref: txRef || null
      };

      await api.createPayment(orderId, payload);

      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Thu tiền thành công',
        message: `Đã thu ${amountNum.toLocaleString()}đ`
      });

      // Reset form
      setAmount('');
      setAmountTendered('');
      setTxRef('');
      
      // Reload
      await loadSettlement();
      
      // Callback nếu đã thanh toán đủ
      if (settlement?.amount_due === 0) {
        onPaymentComplete?.();
      }
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi thu tiền',
        message: error.message || 'Không thể thu tiền'
      });
    } finally {
      setLoading(false);
    }
  };

  const change = selectedMethod === 'CASH' && amountTendered && amount
    ? Math.max(0, parseInt(amountTendered) - parseInt(amount))
    : 0;

  const amountDue = settlement?.amount_due || 0;

  return (
    <div className="space-y-3">
      {/* Settlement Summary */}
      {settlement && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Tổng cộng:</span>
              <span className="font-bold text-gray-900">
                {settlement.grand_total?.toLocaleString()}đ
              </span>
            </div>
            {settlement.payments_captured > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Đã thu:</span>
                <span className="font-semibold text-green-600">
                  -{settlement.payments_captured?.toLocaleString()}đ
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-emerald-300">
              <span className="text-emerald-900">Còn phải trả:</span>
              <span className={amountDue > 0 ? 'text-orange-600' : 'text-green-600'}>
                {amountDue.toLocaleString()}đ
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment form - chỉ hiển thị khi còn phải trả */}
      {amountDue > 0 && (
        <>
          {/* Payment methods */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phương thức</label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(method => (
                <button
                  key={method.code}
                  onClick={() => setSelectedMethod(method.code)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus:outline-none ${
                    selectedMethod === method.code
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {method.name}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Số tiền</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nhập số tiền..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Cash specific */}
          {selectedMethod === 'CASH' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Khách đưa</label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="Số tiền khách đưa..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {/* Quick buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[50000, 100000, 200000, 500000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmountTendered(val.toString())}
                      className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors outline-none focus:outline-none"
                    >
                      {val / 1000}k
                    </button>
                  ))}
                </div>
              </div>
              
              {change > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-blue-900">Tiền thừa:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {change.toLocaleString()}đ
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Non-cash reference */}
          {selectedMethod !== 'CASH' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mã tham chiếu
              </label>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="MB-123456..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={loading || !amount}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
          >
            {loading ? 'Đang xử lý...' : '💵 Thu tiền'}
          </button>
        </>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Lịch sử thanh toán:</h4>
          <div className="space-y-2">
            {payments.map(payment => (
              <div
                key={payment.id}
                className={`p-3 rounded-lg border ${
                  payment.status === 'VOIDED'
                    ? 'bg-gray-50 border-gray-300 opacity-60'
                    : 'bg-white border-emerald-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {payment.method_code === 'CASH' ? '💵' : payment.method_code === 'BANK' ? '🏦' : payment.method_code === 'QR' ? '📱' : '💳'} {payment.amount?.toLocaleString()}đ
                    </span>
                    {payment.method_code === 'CASH' && payment.change_given > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        (Thừa: {payment.change_given.toLocaleString()}đ)
                      </span>
                    )}
                    {payment.tx_ref && (
                      <div className="text-xs text-gray-500">{payment.tx_ref}</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(payment.created_at).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

