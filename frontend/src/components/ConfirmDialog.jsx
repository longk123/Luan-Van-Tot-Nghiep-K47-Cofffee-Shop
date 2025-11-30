// src/components/ConfirmDialog.jsx
import { AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy', type = 'danger', disabled = false }) {
  if (!open) return null;

  const colors = {
    danger: {
      bg: 'bg-red-500',
      hover: 'hover:bg-white hover:text-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      border: 'border-red-500'
    },
    warning: {
      bg: 'bg-amber-600',
      hover: 'hover:bg-white hover:text-amber-600',
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      border: 'border-amber-600'
    },
    info: {
      bg: 'bg-[#c9975b]',
      hover: 'hover:bg-white hover:text-[#c9975b]',
      icon: Info,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
      border: 'border-[#c9975b]'
    },
    success: {
      bg: 'bg-green-500',
      hover: 'hover:bg-white hover:text-green-500',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50',
      border: 'border-green-500'
    }
  };

  const colorSet = colors[type] || colors.danger;
  const Icon = colorSet.icon;

  // Xử lý message có thể là string, React element, hoặc có \n
  const isReactElement = typeof message !== 'string';
  const messageLines = isReactElement ? [] : message.split('\n').filter(line => line.trim());

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto animate-scale-in">
          {/* Header with icon */}
          <div className="px-6 py-5 border-b border-gray-200 flex items-center gap-4">
            <div className={`${colorSet.iconBg} rounded-full p-3`}>
              <Icon className={`w-6 h-6 ${colorSet.iconColor}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 flex-1">{title}</h3>
          </div>
          
          {/* Message */}
          <div className="p-6">
            {isReactElement ? (
              message
            ) : (
              <div className="text-gray-700 space-y-2">
                {messageLines.map((line, index) => (
                  <p key={index} className={index === 0 ? 'font-medium' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-white hover:text-gray-900 text-gray-700 border-2 border-gray-200 hover:border-gray-400 rounded-xl font-semibold transition-all duration-200 outline-none focus:outline-none"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={disabled}
              className={`flex-1 py-3 px-4 ${colorSet.bg} ${colorSet.hover} text-white border-2 ${colorSet.border} rounded-xl font-semibold transition-all duration-200 outline-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

