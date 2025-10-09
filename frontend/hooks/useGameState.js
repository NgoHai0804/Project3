import { useSelector, useDispatch } from 'react-redux';
import { setMove, setWinner, setDraw, resetGame, undoMove, setPlayers } from '../store/gameSlice';
import { BOARD_SIZE } from '../utils/constants';

export const useGameState = () => {
  const dispatch = useDispatch();
  const game = useSelector((state) => state.game);

  const handleMove = (moveData) => {
    dispatch(setMove(moveData));
  };

  const handleWinner = (winnerData) => {
    dispatch(setWinner(winnerData));
  };

  const handleDraw = () => {
    dispatch(setDraw());
  };

  const handleReset = () => {
    dispatch(resetGame());
  };

  const handleUndo = (undoData) => {
    dispatch(undoMove(undoData));
  };

  const updatePlayers = (players) => {
    dispatch(setPlayers(players));
  };

  const isMyTurn = (currentUserId) => {
    if (!game.players || game.players.length === 0) return false;
    const currentPlayer = game.players[game.currentPlayerIndex];
    return currentPlayer?.userId === currentUserId;
  };

  const canMakeMove = (x, y) => {
    if (game.isGameOver) return false;
    if (!game.board[x] || game.board[x][y] !== null) return false;
    return true;
  };

  return {
    board: game.board,
    currentTurn: game.currentTurn,
    currentPlayerIndex: game.currentPlayerIndex,
    players: game.players,
    winner: game.winner,
    winnerMark: game.winnerMark,
    isGameOver: game.isGameOver,
    isDraw: game.isDraw,
    history: game.history,
    roomId: game.roomId,
    handleMove,
    handleWinner,
    handleDraw,
    handleReset,
    handleUndo,
    updatePlayers,
    isMyTurn,
    canMakeMove,
  };
};

export default useGameState;
