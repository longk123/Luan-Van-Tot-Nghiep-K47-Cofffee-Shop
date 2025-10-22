// src/components/PaymentSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function PaymentSection({ orderId, isPaid, refreshTrigger, onPaymentComplete, onShowToast }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [payments, setPayments] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('CASH');
  const [amount, setAmount] = useState('');
  const [amountTendered, setAmountTendered] = useState('');
  const [txRef, setTxRef] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Refund dialog state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundPayment, setRefundPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    loadPaymentMethods();
  }, [orderId]);

  useEffect(() => {
    loadSettlement();
    
    // Reset form khi đổi order hoặc grand total thay đổi
    setAmount('');
    setAmountTendered('');
    setTxRef('');
  }, [orderId, refreshTrigger]);

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
      // Load money summary (có topping) và payments
      const [summaryRes, paymentsRes] = await Promise.all([
        api.getOrderMoneySummary(orderId),
        api.getOrderPayments(orderId)
      ]);
      
      const moneySummary = summaryRes?.data?.summary || summaryRes?.summary || {};
      const paymentsData = paymentsRes?.data || [];
      
      // Tính payments captured & refunded
      const paymentsCaptured = paymentsData
        .filter(p => p.status === 'CAPTURED')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const paymentsRefunded = paymentsData
        .reduce((sum, p) => sum + (p.total_refunded || 0), 0);
      
      const paymentsNet = paymentsCaptured - paymentsRefunded;
      
      // Tính amount_due
      const grandTotal = moneySummary.grand_total || 0;
      const amountDue = Math.max(0, grandTotal - paymentsNet);
      
      // Debug logging
      console.log('💰 Payment Settlement:', {
        grandTotal,
        paymentsCaptured,
        paymentsRefunded,
        paymentsNet,
        amountDue,
        paymentsData
      });
      
      // Tạo settlement object
      const settlement = {
        ...moneySummary,
        payments_captured: paymentsCaptured,
        payments_refunded: paymentsRefunded,
        payments_net: paymentsNet,
        amount_due: amountDue
      };
      
      setSettlement(settlement);
      setPayments(paymentsData);
      
      // Auto-fill amount = amount_due
      setAmount(amountDue > 0 ? amountDue.toString() : '');
    } catch (error) {
      console.error('Error loading settlement:', error);
    }
  };

  const handlePay = async () => {
    const amountNum = parseInt(amount);
    const tenderedNum = selectedMethod === 'CASH' ? parseInt(amountTendered) : null;

    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Số tiền không hợp lệ',
        message: 'Vui lòng nhập số tiền hợp lệ'
      });
      return;
    }

    // Validation cho tiền mặt: phải nhập "Khách đưa"
    if (selectedMethod === 'CASH') {
      if (isNaN(tenderedNum) || tenderedNum <= 0) {
        onShowToast?.({
          show: true,
          type: 'error',
          title: 'Thiếu thông tin',
          message: 'Vui lòng nhập số tiền khách đưa'
        });
        return;
      }
      
      // Kiểm tra khách đưa phải >= số tiền còn phải trả
      if (tenderedNum < amountNum) {
        onShowToast?.({
          show: true,
          type: 'error',
          title: 'Số tiền không đủ',
          message: `Khách đưa ${tenderedNum.toLocaleString()}đ nhỏ hơn số tiền cần thu ${amountNum.toLocaleString()}đ`
        });
        return;
      }
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
      
      // Reload settlement
      await loadSettlement();
      
      // Fetch settlement mới để check amount_due
      const [summaryRes, paymentsRes] = await Promise.all([
        api.getOrderMoneySummary(orderId),
        api.getOrderPayments(orderId)
      ]);
      
      const moneySummary = summaryRes?.data?.summary || summaryRes?.summary || {};
      const paymentsData = paymentsRes?.data || [];
      
      // Tính payments captured & refunded
      const paymentsCaptured = paymentsData
        .filter(p => p.status === 'CAPTURED')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const paymentsRefunded = paymentsData
        .reduce((sum, p) => sum + (p.total_refunded || 0), 0);
      
      const paymentsNet = paymentsCaptured - paymentsRefunded;
      
      // Tính amount_due
      const grandTotal = moneySummary.grand_total || 0;
      const newAmountDue = Math.max(0, grandTotal - paymentsNet);
      
      // Callback nếu đã thanh toán đủ
      if (newAmountDue === 0) {
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

  const handleRefund = async () => {
    const amountNum = parseInt(refundAmount);
    
    if (!refundPayment) return;
    
    if (isNaN(amountNum) || amountNum <= 0) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Số tiền không hợp lệ',
        message: 'Vui lòng nhập số tiền hợp lệ'
      });
      return;
    }
    
    const maxRefund = (refundPayment.amount || 0) - (refundPayment.total_refunded || 0);
    if (amountNum > maxRefund) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Số tiền vượt quá',
        message: `Chỉ có thể hoàn tối đa ${maxRefund.toLocaleString()}đ`
      });
      return;
    }
    
    setLoading(true);
    try {
      await api.refundPayment(orderId, refundPayment.id, {
        amount: amountNum,
        reason: refundReason || null
      });
      
      onShowToast?.({
        show: true,
        type: 'success',
        title: 'Hoàn tiền thành công',
        message: `Đã hoàn ${amountNum.toLocaleString()}đ`
      });
      
      // Reset dialog
      setShowRefundDialog(false);
      setRefundPayment(null);
      setRefundAmount('');
      setRefundReason('');
      
      // Reload settlement
      await loadSettlement();
    } catch (error) {
      onShowToast?.({
        show: true,
        type: 'error',
        title: 'Lỗi hoàn tiền',
        message: error.message || 'Không thể hoàn tiền'
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
      {/* Payment Summary - chỉ hiển thị khi có payments */}
      {settlement && (settlement.payments_captured > 0 || settlement.payments_refunded > 0) && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
          <div className="space-y-2">
            {settlement.payments_captured > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Đã thu:</span>
                <span className="font-semibold text-green-600">
                  {settlement.payments_captured?.toLocaleString()}đ
                </span>
              </div>
            )}
            {settlement.payments_refunded > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-700">Đã hoàn:</span>
                <span className="font-semibold text-red-600">
                  -{settlement.payments_refunded?.toLocaleString()}đ
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment form - chỉ hiển thị khi chưa thanh toán và còn phải trả */}
      {!isPaid && amountDue > 0 && (
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Số tiền còn phải trả</label>
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
            {payments.map(payment => {
              const isVoided = payment.status === 'VOIDED';
              const totalRefunded = payment.total_refunded || 0;
              const canRefund = payment.status === 'CAPTURED' && (payment.amount - totalRefunded) > 0;
              
              return (
                <div
                  key={payment.id}
                  className={`p-3 rounded-lg border ${
                    isVoided
                      ? 'bg-gray-50 border-gray-300 opacity-60'
                      : 'bg-white border-emerald-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {payment.method_code === 'CASH' ? '💵' : payment.method_code === 'BANK' ? '🏦' : payment.method_code === 'QR' ? '📱' : '💳'} {payment.amount?.toLocaleString()}đ
                        </span>
                        {isVoided && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                            ĐÃ HỦY
                          </span>
                        )}
                      </div>
                      
                      {payment.method_code === 'CASH' && payment.change_given > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Tiền thừa: {payment.change_given.toLocaleString()}đ
                        </div>
                      )}
                      
                      {payment.tx_ref && (
                        <div className="text-xs text-gray-500 mt-1">{payment.tx_ref}</div>
                      )}
                      
                      {/* Show refunds */}
                      {totalRefunded > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="text-xs font-semibold text-red-600">
                            Đã hoàn: {totalRefunded.toLocaleString()}đ
                          </div>
                          {payment.refunds && payment.refunds.length > 0 && (
                            <div className="ml-2 space-y-1">
                              {payment.refunds.map(refund => (
                                <div key={refund.id} className="text-xs text-gray-600 flex justify-between">
                                  <span>
                                    - {refund.amount.toLocaleString()}đ
                                    {refund.reason && <span className="text-gray-500 ml-1">({refund.reason})</span>}
                                  </span>
                                  <span className="text-gray-400">
                                    {new Date(refund.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <div className="text-xs text-gray-500">
                        {new Date(payment.created_at).toLocaleTimeString('vi-VN')}
                      </div>
                      
                      {/* Refund button */}
                      {canRefund && (
                        <button
                          onClick={() => {
                            setRefundPayment(payment);
                            setRefundAmount((payment.amount - totalRefunded).toString());
                            setShowRefundDialog(true);
                          }}
                          className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded transition-colors outline-none focus:outline-none"
                        >
                          Hoàn tiền
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Refund Dialog */}
      {showRefundDialog && refundPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Hoàn tiền</h3>
            
            <div className="space-y-4">
              {/* Payment info */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Thanh toán:</div>
                <div className="font-semibold text-gray-900">
                  {refundPayment.method_code} - {refundPayment.amount?.toLocaleString()}đ
                </div>
                {refundPayment.total_refunded > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    Đã hoàn: {refundPayment.total_refunded.toLocaleString()}đ
                  </div>
                )}
                <div className="text-sm text-gray-700 mt-1">
                  Có thể hoàn: <span className="font-semibold text-green-600">
                    {((refundPayment.amount || 0) - (refundPayment.total_refunded || 0)).toLocaleString()}đ
                  </span>
                </div>
              </div>
              
              {/* Refund amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số tiền hoàn
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Nhập số tiền hoàn..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  autoFocus
                />
              </div>
              
              {/* Refund reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lý do hoàn tiền
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Nhập lý do hoàn tiền..."
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              
              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowRefundDialog(false);
                    setRefundPayment(null);
                    setRefundAmount('');
                    setRefundReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors outline-none focus:outline-none"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  onClick={handleRefund}
                  disabled={loading || !refundAmount}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
                >
                  {loading ? 'Đang xử lý...' : 'Hoàn tiền'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

