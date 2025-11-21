import { useState, useEffect, useRef } from 'react';

/**
 * DropdownMenu Component - Menu thả xuống tái sử dụng
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.trigger - Nút trigger (button)
 * @param {React.ReactNode} props.children - Các menu items
 * @param {string} props.align - Căn chỉnh: 'left' | 'right' | 'center'
 */
export default function DropdownMenu({ trigger, children, align = 'left' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đóng dropdown khi nhấn Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div 
            className={`absolute z-50 mt-2 ${alignmentClasses[align]} min-w-[240px] bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden animate-slideDown`}
            style={{
              animation: 'slideDown 0.2s ease-out'
            }}
          >
            {/* Menu Items */}
            <div className="py-2">
              {children}
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * DropdownMenuItem - Item trong dropdown menu
 */
export function DropdownMenuItem({ icon, label, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gradient-to-r hover:from-[#fef7ed] hover:to-[#fef7ed]/50 transition-all duration-150 group"
    >
      {/* Icon */}
      {icon && (
        <div className="w-9 h-9 bg-gradient-to-br from-[#d4a574] to-[#c9975b] rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-150">
          <div className="text-white">
            {icon}
          </div>
        </div>
      )}
      
      {/* Label */}
      <span className="flex-1 font-medium text-gray-700 group-hover:text-[#8B6F47] transition-colors">
        {label}
      </span>
      
      {/* Badge (optional) */}
      {badge && (
        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

/**
 * DropdownMenuDivider - Đường phân cách
 */
export function DropdownMenuDivider() {
  return <div className="h-px bg-gray-200 my-1" />;
}

