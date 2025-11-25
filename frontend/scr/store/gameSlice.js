import { createSlice } from '@reduxjs/toolkit';
import { BOARD_SIZE } from '../utils/constants';

const initialState = {
  board: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
  currentTurn: 'X',
  currentPlayerIndex: 0,
  players: [],
  winner: null,
  winnerMark: null,
  isGameOver: false,
  isDraw: false,
  history: [],
  lastMove: null,
  winningCells: [],
  timer: null,
  roomId: null,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setRoom: (state, action) => {
      state.roomId = action.payload.roomId;
      state.players = action.payload.players || [];
    },
    makeMove: (state, action) => {
      const { x, y, mark } = action.payload;
      if (state.board[x] && state.board[x][y] === null) {
        state.board[x][y] = mark;
        state.history.push({ x, y, mark, timestamp: new Date().toISOString() });
      }
    },
    setMove: (state, action) => {
      const { x, y, mark, board, turn, currentPlayerIndex, history, lastMove } = action.payload;
      state.board = board || state.board;
      state.currentTurn = turn || state.currentTurn;
      state.currentPlayerIndex = currentPlayerIndex !== undefined ? currentPlayerIndex : state.currentPlayerIndex;
      if (history) state.history = history;
      if (lastMove) state.lastMove = lastMove;
    },
    setWinner: (state, action) => {
      state.winner = action.payload.winner;
      state.winnerMark = action.payload.winnerMark;
      state.winningCells = action.payload.winningCells || [];
      state.isGameOver = true;
      state.isDraw = false;
    },
    setDraw: (state) => {
      state.isGameOver = true;
      state.isDraw = true;
      state.winner = null;
      state.winningCells = [];
    },
    resetGame: (state) => {
      state.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      state.currentTurn = 'X';
      state.currentPlayerIndex = 0;
      state.winner = null;
      state.winnerMark = null;
      state.isGameOver = false;
      state.isDraw = false;
      state.history = [];
      state.lastMove = null;
      state.winningCells = [];
    },
    undoMove: (state, action) => {
      const { board, turn, currentPlayerIndex, history } = action.payload;
      if (board) state.board = board;
      if (turn) state.currentTurn = turn;
      if (currentPlayerIndex !== undefined) state.currentPlayerIndex = currentPlayerIndex;
      if (history) state.history = history;
    },
    setTimer: (state, action) => {
      state.timer = action.payload;
    },
    setPlayers: (state, action) => {
      state.players = action.payload;
    },
    clearGame: (state) => {
      return initialState;
    },
    setWinningCells: (state, action) => {
      state.winningCells = action.payload;
    },
    setLastMove: (state, action) => {
      state.lastMove = action.payload;
    },
  },
});

export const {
  setRoom,
  makeMove,
  setMove,
  setWinner,
  setDraw,
  resetGame,
  undoMove,
  setTimer,
  setPlayers,
  clearGame,
  setLastMove,
  setWinningCells,
} = gameSlice.actions;
export default gameSlice.reducer;
