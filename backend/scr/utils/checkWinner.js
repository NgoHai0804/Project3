// checkWinner.js
// Kiểm tra người chơi có thắng sau nước đi tại (x, y) không

function checkWinner(board, x, y) {
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

module.exports = { checkWinner };
