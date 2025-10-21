// === src/components/Toast.jsx ===
import { useState, useEffect } from 'react';

export default function Toast({ 
  show, 
  onClose, 
  type = 'success', 
  title, 
  message, 
  duration = 4000 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsLeaving(false);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'from-green-50 to-green-100',
          border: 'border-green-200',
          icon: 'text-green-500',
          iconBg: 'bg-green-100',
          title: 'text-green-800',
          message: 'text-green-700'
        };
      case 'error':
        return {
          bg: 'from-red-50 to-red-100',
          border: 'border-red-200',
          icon: 'text-red-500',
          iconBg: 'bg-red-100',
          title: 'text-red-800',
          message: 'text-red-700'
        };
      case 'warning':
        return {
          bg: 'from-yellow-50 to-yellow-100',
          border: 'border-yellow-200',
          icon: 'text-yellow-500',
          iconBg: 'bg-yellow-100',
          title: 'text-yellow-800',
          message: 'text-yellow-700'
        };
      case 'info':
        return {
          bg: 'from-blue-50 to-blue-100',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          iconBg: 'bg-blue-100',
          title: 'text-blue-800',
          message: 'text-blue-700'
        };
      default:
        return {
          bg: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          iconBg: 'bg-gray-100',
          title: 'text-gray-800',
          message: 'text-gray-700'
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed top-4 right-4 z-[999999] pointer-events-none">
      <div 
        className={`
          pointer-events-auto transform transition-all duration-300 ease-out
          ${isLeaving ? 'translate-x-full opacity-0 scale-95' : 'translate-x-0 opacity-100 scale-100'}
          bg-gradient-to-r ${styles.bg} border ${styles.border} rounded-2xl shadow-2xl
          max-w-sm w-full backdrop-blur-sm
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center`}>
              <div className={styles.icon}>
                {getIcon()}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-bold ${styles.title} mb-1`}>
                {title}
              </h4>
              <p className={`text-sm ${styles.message} leading-relaxed`}>
                {message}
              </p>
            </div>
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className={`flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors ${styles.icon}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-black/10 rounded-b-2xl overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${styles.icon} transition-all ease-linear`}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
