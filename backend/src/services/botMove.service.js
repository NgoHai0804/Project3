// botMoveEvaluator.js
// Evaluator for Gomoku/Caro bot moves based on pattern scoring
// Converted from Python

// ================== CONFIG ==================
const SCORES = {
  "4": [
      { pattern: "_XXXX", score: 100000 },
      { pattern: "X_XXX", score: 100000 },
      { pattern: "XX_XX", score: 100000 }
  ],
  "3": [
      { pattern: "__XXX", score: 10000 },
      { pattern: "_X_XX", score: 10000 },
      { pattern: "_XX_X", score: 10000 },
      { pattern: "_XXX_", score: 10000 },
      { pattern: "X__XX", score: 10000 },
      { pattern: "X_X_X", score: 10000 }
  ],
  "2": [
      { pattern: "___XX", score: 500 },
      { pattern: "__X_X", score: 500 },
      { pattern: "__XX_", score: 500 },
      { pattern: "_X__X", score: 500 },
      { pattern: "_X_X_", score: 500 },
      { pattern: "X___X", score: 500 }
  ],
  "1": [
      { pattern: "X____", score: 50 },
      { pattern: "_X___", score: 50 },
      { pattern: "__X__", score: 50 }
  ]
};

const DIRECTIONS = [
  [1, 0], // ngang
  [0, 1], // dọc
  [1, 1], // chéo chính
  [1, -1] // chéo phụ
];

// Utils
function expandScores(scores) {
  const out = {};
  for (const k of Object.keys(scores)) {
      const tmp = [];
      for (const e of scores[k]) {
          tmp.push(e);
          const rev = e.pattern.split('').reverse().join('');
          if (rev !== e.pattern) {
              tmp.push({ pattern: rev, score: e.score });
          }
      }
      out[k] = tmp;
  }
  return out;
}

const SCORES_EXPANDED = expandScores(SCORES);

function normalizeBoard(board, mark) {
  const opp = mark === 'X' ? 'O' : 'X';
  const n = board.length;
  const newBoard = Array.from({ length: n }, () => Array(n).fill(null));
  for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
          if (board[i][j] === mark) {
              newBoard[i][j] = 'X';
          } else if (board[i][j] === opp) {
              newBoard[i][j] = 'O';
          } else {
              newBoard[i][j] = null;
          }
      }
  }
  return newBoard;
}

function getLinePattern(board, x, y, dx, dy) {
  const n = board.length;
  let s = '';
  for (let i = -4; i <= 4; i++) {
      const nx = x + dx * i;
      const ny = y + dy * i;
      if (nx >= 0 && nx < n && ny >= 0 && ny < n) {
          s += board[nx][ny] || '_';
      } else {
          s += '_';
      }
  }
  return s;
}

function printBoard(board) {
  const n = board.length;
  // Header cột
  let header = ' ';
  for (let j = 0; j < n; j++) {
      header += `${j.toString().padStart(2)} `;
  }
  console.log(header);
  for (let i = 0; i < n; i++) {
      let row = `${i.toString().padStart(2)} `;
      for (let j = 0; j < n; j++) {
          const cell = board[i][j];
          if (cell === null) {
              row += ' . ';
          } else {
              row += ` ${cell} `;
          }
      }
      console.log(row);
  }
  console.log();
}

// ================== CORE ==================
function evaluateCell(board, x, y, multiplier = 1.0) {
  let score = 0;
  const patterns = [];
  for (const [dx, dy] of DIRECTIONS) {
      const line = getLinePattern(board, x, y, dx, dy);
      for (const group of ['4', '3', '2', '1']) {
          for (const e of SCORES_EXPANDED[group]) {
              if (line.includes(e.pattern)) {
                  score += e.score * multiplier;
                  patterns.push(e.pattern);
              }
          }
      }
  }
  return [score, patterns];
}

function getBorderCells(board) {
  const n = board.length;
  const s = new Set();
  for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
          if (board[i][j]) {
              for (let dx = -1; dx <= 1; dx++) {
                  for (let dy = -1; dy <= 1; dy++) {
                      const ni = i + dx;
                      const nj = j + dy;
                      if (ni >= 0 && ni < n && nj >= 0 && nj < n) {
                          if (board[ni][nj] === null) {
                              s.add(`${ni},${nj}`);
                          }
                      }
                  }
              }
          }
      }
  }
  return Array.from(s).map(pos => {
      const [ni, nj] = pos.split(',').map(Number);
      return [ni, nj];
  });
}

function evaluateBoard(board, currentMark) {
  const opp = currentMark === 'X' ? 'O' : 'X';
  const border = getBorderCells(board);
  const boardBot = normalizeBoard(board, currentMark);
  const boardOpp = normalizeBoard(board, opp);
  const result = {};
  for (const [x, y] of border) {
      const [atk, pAtk] = evaluateCell(boardBot, x, y, 1.5);
      const [defn, pDef] = evaluateCell(boardOpp, x, y, 1.0);
      result[`${x},${y}`] = {
          score: atk + defn,
          attack: atk,
          defense: defn,
          patterns_bot: pAtk,
          patterns_opp: pDef
      };
  }
  return result;
}

function bestMove(board, currentMark) {
  const scores = evaluateBoard(board, currentMark);
  let maxKey = null;
  let maxValue = -Infinity;
  for (const [key, value] of Object.entries(scores)) {
      if (value.score > maxValue) {
          maxValue = value.score;
          maxKey = key;
      }
  }
  const [x, y] = maxKey.split(',').map(Number);
  return [[x, y], scores[maxKey]];
}

// ================== DEMO ==================
if (require.main === module) {
  const N = 15;
  const board = Array.from({ length: N }, () => Array(N).fill(null));
  // Setup test
  board[7][7] = 'X';
  console.log('=== INITIAL BOARD ===');
  printBoard(board);
  let current = 'X';
  for (let turn = 1; turn <= 50; turn++) { // chạy 50 lượt
      console.log(`===== TURN ${turn} | ${current} ======`);
      const scores = evaluateBoard(board, current);
      if (Object.keys(scores).length === 0) {
          console.log('No possible moves!');
          break;
      }
      const [[x, y], info] = bestMove(board, current);
      console.log(`Move: ${current} -> (${x},${y})`);
      console.log(`Score: ${info.score}`);
      console.log(`Attack: ${info.patterns_bot}`);
      console.log(`Defense: ${info.patterns_opp}`);
      board[x][y] = current;
      printBoard(board);
      // đổi lượt
      current = current === 'X' ? 'O' : 'X';
  }
}

// ================== DIFFICULTY LEVELS ==================
/**
 * Tính toán nước đi cho bot với các mức độ khó khác nhau
 * @param {Array} board - Bàn cờ 2D
 * @param {string} botMark - Mark của bot ('X' hoặc 'O')
 * @param {string} difficulty - Mức độ khó ('easy', 'medium', 'hard')
 * @param {Object} lastMove - Nước đi cuối cùng {x, y} (optional)
 * @returns {Object} - {x, y, score, info}
 */
function calculateBotMove(board, botMark, difficulty = 'medium', lastMove = null) {
  if (!board || !Array.isArray(board) || board.length === 0) {
    throw new Error("Board không hợp lệ");
  }
  
  if (botMark !== 'X' && botMark !== 'O') {
    throw new Error("botMark phải là 'X' hoặc 'O'");
  }
  
  const borderCells = getBorderCells(board);
  if (borderCells.length === 0) {
    // Nếu bàn cờ trống, đánh giữa
    const center = Math.floor(board.length / 2);
    return { x: center, y: center, score: 0, info: { difficulty, strategy: 'center' } };
  }
  
  switch (difficulty) {
    case 'easy':
      return calculateEasyMove(board, botMark, borderCells);
    case 'medium':
      return calculateMediumMove(board, botMark);
    case 'hard':
      return calculateHardMove(board, botMark, lastMove);
    default:
      return calculateMediumMove(board, botMark);
  }
}

/**
 * Easy mode: Random move từ các ô border (70% random, 30% defensive)
 */
function calculateEasyMove(board, botMark, borderCells) {
  // 30% cơ hội chơi defensive (chặn đối thủ)
  if (Math.random() < 0.3) {
    const [[x, y], info] = bestMove(board, botMark);
    return { x, y, score: info.score, info: { difficulty: 'easy', strategy: 'defensive' } };
  }
  
  // 70% cơ hội chơi random
  const randomIndex = Math.floor(Math.random() * borderCells.length);
  const [x, y] = borderCells[randomIndex];
  return { x, y, score: 0, info: { difficulty: 'easy', strategy: 'random' } };
}

/**
 * Medium mode: Sử dụng bestMove (pattern matching)
 */
function calculateMediumMove(board, botMark) {
  const [[x, y], info] = bestMove(board, botMark);
  return { 
    x, 
    y, 
    score: info.score, 
    info: { 
      difficulty: 'medium', 
      strategy: 'pattern_matching',
      attack: info.attack,
      defense: info.defense,
      patterns_bot: info.patterns_bot,
      patterns_opp: info.patterns_opp
    } 
  };
}

/**
 * Hard mode: bestMove + lookahead (minimax 1 level)
 */
function calculateHardMove(board, botMark, lastMove) {
  // Bước 1: Lấy nước đi tốt nhất từ pattern matching
  const [[bestX, bestY], bestInfo] = bestMove(board, botMark);
  
  // Bước 2: Nếu điểm số rất cao (gần thắng), đánh luôn
  if (bestInfo.score >= 50000) {
    return { 
      x: bestX, 
      y: bestY, 
      score: bestInfo.score, 
      info: { 
        difficulty: 'hard', 
        strategy: 'winning_move',
        attack: bestInfo.attack,
        defense: bestInfo.defense
      } 
    };
  }
  
  // Bước 3: Minimax 1 level - thử các nước đi tốt nhất và xem phản ứng của đối thủ
  const borderCells = getBorderCells(board);
  const topMoves = [];
  
  // Lấy top 5 nước đi tốt nhất để phân tích
  const scores = evaluateBoard(board, botMark);
  const sortedMoves = Object.entries(scores)
    .sort(([,a], [,b]) => b.score - a.score)
    .slice(0, Math.min(5, borderCells.length));
  
  for (const [posKey, moveInfo] of sortedMoves) {
    const [x, y] = posKey.split(',').map(Number);
    
    // Thử nước đi này
    const newBoard = board.map(row => [...row]);
    newBoard[x][y] = botMark;
    
    // Xem đối thủ sẽ phản ứng như thế nào
    const opponentMark = botMark === 'X' ? 'O' : 'X';
    try {
      const [[oppX, oppY], oppInfo] = bestMove(newBoard, opponentMark);
      
      // Điểm số = điểm của bot - điểm phản ứng của đối thủ
      const finalScore = moveInfo.score - (oppInfo.score * 0.8);
      
      topMoves.push({
        x, y,
        score: finalScore,
        originalScore: moveInfo.score,
        opponentResponse: oppInfo.score,
        info: moveInfo
      });
    } catch (err) {
      // Nếu có lỗi, dùng điểm gốc
      topMoves.push({
        x, y,
        score: moveInfo.score,
        originalScore: moveInfo.score,
        opponentResponse: 0,
        info: moveInfo
      });
    }
  }
  
  // Chọn nước đi có điểm số cao nhất sau khi tính minimax
  topMoves.sort((a, b) => b.score - a.score);
  const bestHardMove = topMoves[0] || { x: bestX, y: bestY, score: bestInfo.score, info: bestInfo };
  
  return {
    x: bestHardMove.x,
    y: bestHardMove.y,
    score: bestHardMove.score,
    info: {
      difficulty: 'hard',
      strategy: 'minimax_1_level',
      originalScore: bestHardMove.originalScore,
      opponentResponse: bestHardMove.opponentResponse,
      attack: bestHardMove.info?.attack || 0,
      defense: bestHardMove.info?.defense || 0
    }
  };
}

module.exports = {
  evaluateBoard,
  bestMove,
  calculateBotMove,
  printBoard,
  normalizeBoard,
  getBorderCells,
  SCORES_EXPANDED,
  DIRECTIONS
};