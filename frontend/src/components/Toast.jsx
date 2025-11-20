// Toast Component for Dashboard/POS (Legacy)
// This is a simple toast component with show, type, title, message, onClose props
import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ show, type = 'success', title = '', message = '', onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const typeConfig = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      text: 'text-green-800',
      titleColor: 'text-green-900'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: XCircle,
      iconColor: 'text-red-600',
      text: 'text-red-800',
      titleColor: 'text-red-900'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: AlertCircle,
      iconColor: 'text-yellow-600',
      text: 'text-yellow-800',
      titleColor: 'text-yellow-900'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      text: 'text-blue-800',
      titleColor: 'text-blue-900'
    }
  };

  const config = typeConfig[type] || typeConfig.success;
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-slide-in-right">
      <div className={`${config.bg} border rounded-lg shadow-lg p-4 flex items-start gap-3`}>
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <div className={`${config.titleColor} font-semibold text-sm mb-1`}>
              {title}
            </div>
          )}
          <div className={`${config.text} text-sm`}>
            {message}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${config.text} hover:opacity-70 transition flex-shrink-0`}
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

