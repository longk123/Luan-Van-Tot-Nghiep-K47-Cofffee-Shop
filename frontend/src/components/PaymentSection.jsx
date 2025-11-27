// src/components/PaymentSection.jsx
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import PaymentQRPanel from './PaymentQRPanel.jsx';

export default function PaymentSection({ orderId, shiftId, isPaid, refreshTrigger, onPaymentComplete, onShowToast }) {
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
  
  // PayOS QR Panel state
  const [showPayOSPanel, setShowPayOSPanel] = useState(false);

  // Lock body scroll when refund dialog is open
  useEffect(() => {
    if (showRefundDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showRefundDialog]);

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
      const methods = res?.data || [];
      
      // Override tên tiếng Việt có dấu (fix encoding issue)
      const methodsWithProperNames = methods.map(m => ({
        ...m,
        name: m.code === 'CASH' ? 'Tiền mặt' 
            : m.code === 'ONLINE' ? 'Thanh toán online'
            : m.code === 'CARD' ? 'Thẻ ATM/Visa'
            : m.name
      }));
      
      setPaymentMethods(methodsWithProperNames);
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
      
      // Auto-fill amount = amount_due (chỉ khi amount đang rỗng)
      setAmount(prev => {
        // Nếu đang có giá trị (người dùng đã nhập), giữ nguyên
        if (prev) return prev;
        // Nếu rỗng, auto-fill với amountDue
        return amountDue > 0 ? amountDue.toString() : '';
      });
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
        tx_ref: txRef || null,
        ca_lam_id: shiftId || null
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
    <div className="space-y-4">
      {/* Payment Summary - chỉ hiển thị khi có payments */}
      {settlement && (settlement.payments_captured > 0 || settlement.payments_refunded > 0) && (
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-5 border-2 border-emerald-300 shadow-sm">
          <div className="space-y-2.5">
            {settlement.payments_captured > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-800">Đã thu:</span>
                </div>
                <span className="text-lg font-bold text-green-700">
                  {settlement.payments_captured?.toLocaleString()}đ
                </span>
              </div>
            )}
            {settlement.payments_refunded > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-red-800">Đã hoàn:</span>
                </div>
                <span className="text-lg font-bold text-red-700">
                  -{settlement.payments_refunded?.toLocaleString()}đ
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment form - chỉ hiển thị khi chưa thanh toán và còn phải trả */}
      {!isPaid && amountDue > 0 && (
        <div className="space-y-3">
          {/* Payment methods */}
          <div className="bg-white rounded-xl p-3 border-2 border-gray-100 shadow-sm">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide">
              <div className="p-1 bg-amber-100 rounded-md">
                <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(method => {
                const isSelected = selectedMethod === method.code;
                const isCash = method.code === 'CASH';
                const isOnline = method.code === 'ONLINE';
                const isCard = method.code === 'CARD';
                
                return (
                  <button
                    key={method.code}
                    onClick={() => {
                      setSelectedMethod(method.code);
                      // Ẩn PayOS panel khi chọn method khác
                      if (method.code !== 'ONLINE') {
                        setShowPayOSPanel(false);
                      }
                    }}
                    className={`group relative overflow-hidden px-3 py-2.5 rounded-lg font-bold transition-all duration-200 outline-none focus:outline-none ${
                      isSelected
                        ? isCash
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md shadow-green-500/25 scale-[1.02]'
                          : isOnline
                          ? 'bg-gradient-to-br from-[#d4a574] to-[#c9975b] text-white shadow-md shadow-[#c9975b]/25 scale-[1.02]'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-200 hover:border-[#d4a574] hover:shadow-sm hover:scale-[1.01]'
                    }`}
                  >
                    {/* Animated background on hover */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#FEF7ED] to-[#FAF5EF] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    )}
                    
                    <div className="relative flex flex-col items-center gap-1">
                      {isCash && (
                        <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                      {isOnline && (
                        <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      {isCard && (
                        <svg className={`w-5 h-5 transition-transform group-hover:scale-110 ${isSelected ? 'text-white' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      )}
                      <span className="text-[10px] leading-tight font-bold">{method.name}</span>
                    </div>
                    
                    {/* Checkmark indicator */}
                    {isSelected && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md">
                        <svg className="w-2.5 h-2.5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* PayOS QR Panel cho "Thanh toan online" */}
          {selectedMethod === 'ONLINE' && !showPayOSPanel && (
            <button
              onClick={() => setShowPayOSPanel(true)}
              className="group relative overflow-hidden w-full py-3 px-4 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl font-bold text-base transition-all duration-300 shadow-lg shadow-[#c9975b]/25 hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] outline-none focus:outline-none"
            >
              {/* Animated shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              
              <div className="relative flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 9h6v6H9z" />
                </svg>
                <span>Tạo mã thanh toán online</span>
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          )}
          
          {showPayOSPanel && selectedMethod === 'ONLINE' && (
            <PaymentQRPanel
              orderId={orderId}
              amount={amountDue}
              onPaymentSuccess={async () => {
                setShowPayOSPanel(false);
                await loadSettlement();
                onPaymentComplete?.();
              }}
              onShowToast={onShowToast}
              onClose={() => setShowPayOSPanel(false)}
            />
          )}

          {/* Amount display - read-only, ẩn khi đang hiển thị PayOS panel */}
          {!showPayOSPanel && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border-2 border-amber-200 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2 uppercase tracking-wide">
                <div className="p-1 bg-amber-200 rounded-md">
                  <svg className="w-3 h-3 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Số tiền thanh toán
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <span className="text-lg font-black text-amber-700">đ</span>
                </div>
                <div className="w-full pl-10 pr-3 py-3 text-xl font-bold border-2 border-amber-300 bg-amber-50/50 rounded-lg text-amber-900 cursor-not-allowed select-none">
                  {amount || '0'}
                </div>
              </div>
            </div>
          )}

          {/* Cash specific - ẩn khi đang hiển thị PayOS panel */}
          {!showPayOSPanel && selectedMethod === 'CASH' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 border-2 border-green-200 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-green-900 mb-2 uppercase tracking-wide">
                  <div className="p-1 bg-green-200 rounded-md">
                    <svg className="w-3 h-3 text-green-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  Khách đưa
                </label>
                <input
                  type="number"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="Số tiền khách đưa..."
                  className="w-full px-3 py-2.5 text-base font-bold border-2 border-green-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all placeholder:text-green-300"
                />
                {/* Quick buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[50000, 100000, 200000, 500000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmountTendered(val.toString())}
                      className="group relative overflow-hidden px-2 py-2 bg-white hover:bg-gradient-to-br hover:from-[#FEF7ED] hover:to-[#FAF5EF] border-2 border-[#d4a574] hover:border-[#c9975b] rounded-lg text-xs font-bold text-[#8B6F47] transition-all duration-150 hover:shadow-md hover:scale-105 active:scale-95"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#FAF5EF] to-[#F5EFE7] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <span className="relative">{val / 1000}k</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {change > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-xl p-3 shadow-lg shadow-[#c9975b]/25">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '15px 15px'}}></div>
                  </div>
                  
                  <div className="relative flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-white uppercase tracking-wide">Tiền thừa</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white drop-shadow-md">
                        {change.toLocaleString()}
                      </span>
                      <span className="text-sm font-bold text-white/90">đ</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Non-cash reference - chỉ hiển thị cho CARD */}
          {!showPayOSPanel && selectedMethod === 'CARD' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-blue-900 mb-2 uppercase tracking-wide">
                <div className="p-1 bg-blue-200 rounded-md">
                  <svg className="w-3 h-3 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                Mã tham chiếu
              </label>
              <input
                type="text"
                value={txRef}
                onChange={(e) => setTxRef(e.target.value)}
                placeholder="VD: MB-123456..."
                className="w-full px-3 py-2.5 text-base font-bold border-2 border-blue-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-blue-300"
              />
            </div>
          )}

          {/* Pay button - ẩn khi đang hiển thị PayOS panel */}
          {!showPayOSPanel && (
            <button
              onClick={handlePay}
              disabled={loading || !amount}
              className="group relative overflow-hidden w-full py-3.5 px-6 bg-gradient-to-r from-[#d4a574] via-[#c9975b] to-[#d4a574] text-white border-2 border-[#c9975b] rounded-xl font-black text-base transition-all duration-200 shadow-lg shadow-[#c9975b]/25 hover:bg-white hover:from-white hover:via-white hover:to-white hover:text-[#c9975b] hover:border-[#c9975b] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] outline-none focus:outline-none"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              <div className="relative flex items-center justify-center gap-2.5">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="uppercase tracking-wide">Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="capitalize tracking-wide">Thu tiền</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </div>
            </button>
          )}
        </div>
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
                          className="text-xs bg-amber-100 hover:bg-orange-200 text-amber-800 px-2 py-1 rounded transition-colors outline-none focus:outline-none"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
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
                {/* Cảnh báo cho non-cash payments */}
                {refundPayment.method_code !== 'CASH' && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="text-xs text-amber-800">
                        <div className="font-semibold">Lưu ý:</div>
                        <div>Hoàn tiền tượng trưng (chỉ ghi nhận trong hệ thống). Cần xử lý hoàn tiền thực tế bên ngoài hệ thống.</div>
                      </div>
                    </div>
                  </div>
                )}
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
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
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
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
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-red-500 hover:from-amber-700 hover:to-red-600 text-white rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed outline-none focus:outline-none"
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

