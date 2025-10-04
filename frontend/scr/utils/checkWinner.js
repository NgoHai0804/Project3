// checkWinner.js - Kiểm tra người chơi có thắng sau nước đi tại (x, y) không

export function checkWinner(board, x, y) {
  const mark = board[x][y];
  if (!mark) return false;

  const dirs = [
    [1, 0],   // Ngang
    [0, 1],   // Dọc
    [1, 1],   // Chéo xuống
    [1, -1],  // Chéo lên
  ];

  for (let [dx, dy] of dirs) {
    let count = 1;

    // Nhích trái/lên
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (board[nx]?.[ny] === mark) count++;
      else break;
    }

    // Nhích phải/xuống
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (board[nx]?.[ny] === mark) count++;
      else break;
    }

    if (count >= 5) return true;
  }

  return false;
}

// Tìm các ô tạo thành đường thắng (trả về 5 ô đầu tiên)
export function getWinningCells(board, x, y) {
  const mark = board[x][y];
  if (!mark) return [];

  const dirs = [
    [1, 0],   // Ngang
    [0, 1],   // Dọc
    [1, 1],   // Chéo xuống
    [1, -1],  // Chéo lên
  ];

  for (let [dx, dy] of dirs) {
    const cells = [{ x, y }];
    let count = 1;

    // Nhích trái/lên
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i;
      const ny = y - dy * i;
      if (board[nx]?.[ny] === mark) {
        count++;
        cells.unshift({ x: nx, y: ny });
      } else break;
    }

    // Nhích phải/xuống
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (board[nx]?.[ny] === mark) {
        count++;
        cells.push({ x: nx, y: ny });
      } else break;
    }

    if (count >= 5) {
      return cells.slice(0, 5);
    }
  }

  return [];
}

