import { useEffect, useState } from 'react';
import Dashboard from './Dashboard.jsx';
import { api } from '../api.js';
import Toast from '../components/Toast.jsx';

export default function POS() {
  const [shift, setShift] = useState(null);
  const [toast, setToast] = useState({ show: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMyOpenShift();
        setShift(res?.data || null);
      } catch (error) {
        console.error('Error loading shift:', error);
        setShift(null);
      }
    })();

    // Detect payment redirect từ PayOS
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const refCode = urlParams.get('ref');

    if (paymentStatus === 'success') {
      setToast({
        show: true,
        type: 'success',
        title: 'Thanh toán thành công!',
        message: `Đã nhận thanh toán qua PayOS${refCode ? ` - Mã: ${refCode}` : ''}`
      });
      // Xóa query params khỏi URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      setToast({
        show: true,
        type: 'warning',
        title: 'Đã hủy thanh toán',
        message: 'Khách hàng đã hủy thanh toán'
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <>
      <Dashboard defaultMode="pos" shift={shift} />
      {toast.show && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
    </>
  );
}
