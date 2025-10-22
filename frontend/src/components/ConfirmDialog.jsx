// src/components/ConfirmDialog.jsx
export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmText = 'Xác nhận', cancelText = 'Hủy', type = 'danger' }) {
  if (!open) return null;

  const colors = {
    danger: {
      bg: 'from-red-500 to-red-600',
      hover: 'from-red-600 to-red-700'
    },
    warning: {
      bg: 'from-orange-500 to-orange-600',
      hover: 'from-orange-600 to-orange-700'
    },
    info: {
      bg: 'from-blue-500 to-blue-600',
      hover: 'from-blue-600 to-blue-700'
    },
    success: {
      bg: 'from-green-500 to-green-600',
      hover: 'from-green-600 to-green-700'
    }
  };

  const colorSet = colors[type] || colors.danger;

  return (
    <>
      <div 
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          
          <div className="p-6">
            <p className="text-gray-700">{message}</p>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors outline-none focus:outline-none"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 bg-gradient-to-r ${colorSet.bg} hover:${colorSet.hover} text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg outline-none focus:outline-none`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

