import React, { useState, useEffect } from 'react';
import '../../styles/components.css';

// Ô cờ trên bàn chơi
const Cell = ({ value, x, y, isHovered, onClick, onMouseEnter, onMouseLeave, disabled, isLastMove = false, isWinningCell = false, boardTheme = 'default', themeColors = null }) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (isWinningCell) {
      // Sau khi animation hoàn thành, chuyển sang trạng thái final
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setAnimationComplete(false);
    }
  }, [isWinningCell]);
  // Hiển thị nội dung ô cờ
  const getCellContent = () => {
    if (value === 'X') {
      return (
        <span 
          className="text-blue-600 font-bold leading-none block"
          style={{ 
            fontSize: 'clamp(0.875rem, 2.5vw, 1.5rem)', 
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%'
          }}
        >
          ✕
        </span>
      );
    }
    if (value === 'O') {
      return (
        <span 
          className="text-red-600 font-bold leading-none block"
          style={{ 
            fontSize: 'clamp(1.5rem, 5vw, 3rem)', 
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            transform: 'translateY(-3px)'
          }}
        >
          ○
        </span>
      );
    }
    return null;
  };

  // Sử dụng theme colors nếu có, nếu không thì dùng mặc định
  const cellBg = themeColors?.cell || 'bg-white';
  const cellBorder = themeColors?.cellBorder || 'border-gray-300';
  const cellHover = themeColors?.cellHover || 'bg-gray-100';
  
  // Tạo hover border đậm hơn từ border hiện tại
  const getHoverBorder = (borderClass) => {
    if (!borderClass) return 'border-gray-400';
    // Chuyển đổi border color thành hover border (đậm hơn)
    const borderMap = {
      'border-gray-300': 'border-gray-500',
      'border-amber-400': 'border-amber-600',
      'border-green-400': 'border-green-600',
      'border-blue-400': 'border-blue-600',
      'border-gray-600': 'border-gray-500',
    };
    return borderMap[borderClass] || 'border-gray-400';
  };
  const cellHoverBorder = getHoverBorder(cellBorder);

  return (
    <button
      className={`
        w-full h-full border ${cellBorder} ${cellBg}
        flex items-center justify-center
        transition-all duration-200
        p-0
        ${isHovered && !value && !disabled ? `${cellHover} ${cellHoverBorder}` : ''}
        ${isLastMove && !isWinningCell ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}
        ${isWinningCell && !animationComplete ? 'winning-cell' : ''}
        ${isWinningCell && animationComplete ? 'winning-cell-final' : ''}
        ${disabled && !value ? 'cursor-not-allowed opacity-50' : ''}
        ${!disabled && !value ? 'cursor-pointer' : ''}
        ${value ? 'cursor-default' : ''}
      `}
      onClick={() => !disabled && !value && onClick(x, y)}
      onMouseEnter={() => !disabled && !value && onMouseEnter(x, y)}
      onMouseLeave={onMouseLeave}
      disabled={disabled || !!value}
      style={{ minHeight: 0, minWidth: 0 }}
    >
      {/* Nội dung ô cờ */}
      {getCellContent()}
    </button>
  );
};

export default Cell;
