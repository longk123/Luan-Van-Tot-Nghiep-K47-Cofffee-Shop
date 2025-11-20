// Toast Notification Component for Customer Portal
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const error = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const warning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  const info = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const { message, type } = toast;

  const typeConfig = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      text: 'text-green-800'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: XCircle,
      iconColor: 'text-red-600',
      text: 'text-red-800'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      text: 'text-yellow-800'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      text: 'text-blue-800'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className={`flex-1 ${config.text} text-sm`}>
        {message}
      </div>
      <button
        onClick={onClose}
        className={`${config.text} hover:opacity-70 transition flex-shrink-0`}
        aria-label="Đóng"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

