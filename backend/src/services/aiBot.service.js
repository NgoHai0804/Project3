// aiBot.service.js - AI Bot Caro sử dụng Minimax

const { checkWinner } = require("../utils/checkWinner");

// Đánh giá điểm số của bàn cờ
function evaluateBoard(board, mark) {
  const opponentMark = mark === 'X' ? 'O' : 'X';
  let score = 0;
  const BOARD_SIZE = board.length;

  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y] === null) continue;

      for (let [dx, dy] of dirs) {
        const lineScore = evaluateLine(board, x, y, dx, dy, mark, opponentMark);
        score += lineScore;
      }
    }
  }

  return score;
}

// Đánh giá điểm số của một đường thẳng
function evaluateLine(board, x, y, dx, dy, mark, opponentMark) {
  const BOARD_SIZE = board.length;
  let count = 0;
  let blocked = 0;
  let openEnds = 0;

  let i = 0;
  while (i < 5) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (nx < 0 || nx >= BOARD_SIZE || ny < 0 || ny >= BOARD_SIZE) {
      blocked++; // Ra ngoài bàn cờ = bị chặn
      break;
    }
    if (board[nx][ny] === mark) count++;
    else if (board[nx][ny] === opponentMark) {
      blocked++; // Gặp quân đối thủ = bị chặn
      break;
    }
    i++;
  }

  const prevX = x - dx;
  const prevY = y - dy;
  if (prevX >= 0 && prevX < BOARD_SIZE && prevY >= 0 && prevY < BOARD_SIZE && board[prevX][prevY] === null) {
    openEnds++;
  }

  const nextX = x + dx * 5;
  const nextY = y + dy * 5;
  if (nextX >= 0 && nextX < BOARD_SIZE && nextY >= 0 && nextY < BOARD_SIZE && board[nextX][nextY] === null) {
    openEnds++;
  }

  // Tính điểm dựa trên số quân liên tiếp và số đầu mở (đầu mở = có thể phát triển)
  if (count === 5) return 100000; // Thắng (5 quân liên tiếp)
  if (count === 4 && openEnds > 0) return 10000; // 4 quân mở (rất nguy hiểm)
  if (count === 4) return 1000; // 4 quân bị chặn một đầu
  if (count === 3 && openEnds > 0) return 100; // 3 quân mở (nguy hiểm)
  if (count === 3) return 10; // 3 quân bị chặn
  if (count === 2 && openEnds > 0) return 5; // 2 quân mở
  return 1; // 1 quân hoặc ít hơn
}

// Lấy danh sách các nước đi hợp lệ
function getValidMoves(board, lastMove) {
  const BOARD_SIZE = board.length;
  const moves = [];
  const visited = new Set();

  if (lastMove) {
    const { x, y } = lastMove;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && board[nx][ny] === null) {
          const key = `${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            moves.push({ x: nx, y: ny, priority: Math.abs(dx) + Math.abs(dy) });
          }
        }
      }
    }
  }

  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (board[x][y] === null) {
        const key = `${x},${y}`;
        if (!visited.has(key)) {
          visited.add(key);
          moves.push({ x, y, priority: 100 });
        }
      }
    }
  }

  moves.sort((a, b) => a.priority - b.priority);
  return moves.map(m => ({ x: m.x, y: m.y }));
}

// Thuật toán Minimax với alpha-beta pruning
function minimax(board, depth, isMaximizing, mark, opponentMark, alpha, beta, lastMove) {
  if (lastMove) {
    const { x, y } = lastMove;
    if (checkWinner(board, x, y)) {
      return isMaximizing ? -100000 : 100000;
    }
  }

  const isFull = board.every(row => row.every(cell => cell !== null));
  if (isFull) return 0;

  if (depth === 0) {
    return evaluateBoard(board, mark) - evaluateBoard(board, opponentMark);
  }

  const moves = getValidMoves(board, lastMove);
  if (moves.length === 0) return 0;

  const maxMoves = depth > 2 ? 10 : moves.length;
  const limitedMoves = moves.slice(0, maxMoves);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of limitedMoves) {
      board[move.x][move.y] = mark;
      const eval = minimax(board, depth - 1, false, mark, opponentMark, alpha, beta, move);
      board[move.x][move.y] = null;
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of limitedMoves) {
      board[move.x][move.y] = opponentMark;
      const eval = minimax(board, depth - 1, true, mark, opponentMark, alpha, beta, move);
      board[move.x][move.y] = null;
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Tìm nước đi tốt nhất cho bot
function getBestMove(board, botMark, difficulty, lastMove) {
  const playerMark = botMark === 'X' ? 'O' : 'X';
  const moves = getValidMoves(board, lastMove);
  
  if (moves.length === 0) {
    const center = Math.floor(board.length / 2);
    return { x: center, y: center };
  }

  if (difficulty === 'easy') {
    if (Math.random() < 0.3) {
      return moves[Math.floor(Math.random() * Math.min(moves.length, 5))];
    }
    return getBestMoveWithDepth(board, botMark, playerMark, 1, lastMove);
  }

  if (difficulty === 'medium') {
    return getBestMoveWithDepth(board, botMark, playerMark, 2, lastMove);
  }

  if (difficulty === 'hard') {
    return getBestMoveWithDepth(board, botMark, playerMark, 3, lastMove);
  }

  return getBestMoveWithDepth(board, botMark, playerMark, 2, lastMove);
}

// Tìm nước đi tốt nhất với độ sâu minimax
function getBestMoveWithDepth(board, botMark, playerMark, depth, lastMove) {
  const moves = getValidMoves(board, lastMove);
  let bestMove = moves[0];
  let bestEval = -Infinity;

  const maxMoves = depth > 2 ? 15 : moves.length;
  const limitedMoves = moves.slice(0, maxMoves);

  for (const move of limitedMoves) {
    board[move.x][move.y] = botMark;
    const eval = minimax(board, depth, false, botMark, playerMark, -Infinity, Infinity, move);
    board[move.x][move.y] = null;

    if (eval > bestEval) {
      bestEval = eval;
      bestMove = move;
    }
  }

  return bestMove;
}

module.exports = {
  getBestMove,
  evaluateBoard,
};
