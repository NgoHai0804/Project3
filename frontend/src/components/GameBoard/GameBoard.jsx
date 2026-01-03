import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Cell from './Cell';
import useGameBoard from './useGameBoard';
import { BOARD_SIZE } from '../../utils/constants';

// Hàm lấy màu sắc bàn cờ dựa trên theme
const getBoardThemeColors = (theme) => {
  const themes = {
    default: {
      container: 'bg-gray-50',
      grid: 'bg-gray-200',
      cell: 'bg-white',
      cellBorder: 'border-gray-300',
      cellHover: 'bg-gray-100',
    },
    wood: {
      container: 'bg-amber-50',
      grid: 'bg-amber-200',
      cell: 'bg-amber-50',
      cellBorder: 'border-amber-400',
      cellHover: 'bg-amber-100',
    },
    blue: {
      container: 'bg-blue-50',
      grid: 'bg-blue-200',
      cell: 'bg-blue-50',
      cellBorder: 'border-blue-400',
      cellHover: 'bg-blue-100',
    },
    dark: {
      container: 'bg-gray-800',
      grid: 'bg-gray-700',
      cell: 'bg-gray-800',
      cellBorder: 'border-gray-600',
      cellHover: 'bg-gray-700',
    },
  };
  return themes[theme] || themes.default;
};

// Bàn cờ Caro
const GameBoard = ({ onCellClick, disabled = false }) => {
  // Lấy trạng thái game từ Redux store
  const { board, currentTurn, isGameOver, lastMove, winningCells } = useSelector((state) => state.game);
  // Hook xử lý tương tác với bàn cờ (hover, click)
  const { hoveredCell, handleCellHover, handleCellLeave, handleCellClick } = useGameBoard(onCellClick);

  // Lấy theme từ localStorage
  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem('boardColorTheme') || 'default';
  });

  // Lắng nghe thay đổi theme từ localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setBoardTheme(localStorage.getItem('boardColorTheme') || 'default');
    };
    
    const handleThemeChange = (e) => {
      if (e.detail?.theme) {
        setBoardTheme(e.detail.theme);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('boardThemeChanged', handleThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('boardThemeChanged', handleThemeChange);
    };
  }, []);

  const themeColors = getBoardThemeColors(boardTheme);

  // Tính toán độ sáng/tối dựa trên disabled (disabled = true khi không phải lượt hoặc chưa bắt đầu game)
  const isMyTurn = !disabled && !isGameOver;
  // Làm tối vừa phải khi disabled, vẫn đủ sáng để nhìn
  const opacity = disabled ? 'opacity-65' : (isMyTurn ? 'opacity-100' : 'opacity-75');

  return (
    <div className={`w-full max-w-2xl mx-auto ${themeColors.container} p-2 sm:p-4 rounded-lg shadow-lg transition-opacity duration-300 ${opacity}`}>
      {/* Lưới bàn cờ */}
      <div className={`grid gap-0.5 sm:gap-1 ${themeColors.grid} p-1 sm:p-2 rounded`} style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}>
        {board.map((row, x) =>
          row.map((cell, y) => {
            // Kiểm tra ô này có phải nước đi cuối cùng không
            const isLastMoveCell = lastMove && lastMove.x === x && lastMove.y === y;
            // Kiểm tra ô này có phải ô thắng không
            const isWinningCell = winningCells && winningCells.some(cell => cell.x === x && cell.y === y);
            return (
              <div key={`${x}-${y}`} className="aspect-square">
                <Cell
                  value={cell}
                  x={x}
                  y={y}
                  isHovered={hoveredCell?.x === x && hoveredCell?.y === y}
                  isLastMove={isLastMoveCell}
                  isWinningCell={isWinningCell}
                  onClick={handleCellClick}
                  onMouseEnter={handleCellHover}
                  onMouseLeave={handleCellLeave}
                  disabled={disabled || !!cell}
                  boardTheme={boardTheme}
                  themeColors={themeColors}
                />
              </div>
            );
          })
        )}
      </div>
      
      {/* Hiển thị lượt chơi hiện tại */}
      {!isGameOver && (
        <div className="mt-3 sm:mt-4 text-center text-gray-600 text-sm sm:text-base">
          <p>Lượt chơi: <span className="font-bold">{currentTurn}</span></p>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
