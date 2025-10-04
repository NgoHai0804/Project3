import { useState, useCallback } from 'react';
import { BOARD_SIZE } from '../../utils/constants';

export const useGameBoard = (onCellClick) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  const handleCellHover = useCallback((x, y) => {
    setHoveredCell({ x, y });
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  const handleCellClick = useCallback((x, y) => {
    if (onCellClick) {
      onCellClick(x, y);
    }
  }, [onCellClick]);

  return {
    hoveredCell,
    handleCellHover,
    handleCellLeave,
    handleCellClick,
  };
};

export default useGameBoard;
