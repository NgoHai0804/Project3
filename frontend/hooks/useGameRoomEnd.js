// useGameRoomEnd.js - Hook xử lý logic khi game kết thúc

import { useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { setWinner, setDraw } from '../store/gameSlice';
import { playSound } from '../utils/soundManager';
import { useAuth } from './useAuth';
import { gameSocket } from '../services/socket/gameSocket';
import { getWinningCells } from '../utils/checkWinner';

export const useGameRoomEnd = (stopPingInterval, stopTurnTimer) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  
  const gameEndProcessedRef = useRef(false);
  const lastGameEndMessageRef = useRef(null);
  const [gameResult, setGameResult] = useState(null);
  const [gameResultMessage, setGameResultMessage] = useState(null);

  // Xử lý khi game kết thúc
  const handleGameEnd = useCallback((data) => {
    // Tránh xử lý game_end nhiều lần
    if (gameEndProcessedRef.current) {
      if (data.result.winner) {
        // Tính toán winningCells từ board và lastMove
        const board = data.board || [];
        const lastMove = data.lastMove;
        let winningCells = [];
        if (lastMove && board[lastMove.x] && board[lastMove.x][lastMove.y]) {
          winningCells = getWinningCells(board, lastMove.x, lastMove.y);
        }
        dispatch(setWinner({
          winner: data.result.winner,
          winnerMark: data.result.winnerMark,
          winningCells: winningCells,
        }));
      } else {
        dispatch(setDraw());
      }
      return;
    }

    // Đánh dấu đã xử lý
    gameEndProcessedRef.current = true;

    // Dừng ping và timer khi game kết thúc
    if (stopPingInterval) stopPingInterval();
    if (stopTurnTimer) stopTurnTimer();
    
    // Xác định kết quả cho user hiện tại
    const userId = user?.id || user?._id;
    let resultType = null;
    let resultMessage = '';
    
    if (data.result.winner) {
      // Tính toán winningCells từ board và lastMove
      const board = data.board || [];
      const lastMove = data.lastMove;
      let winningCells = [];
      if (lastMove && board[lastMove.x] && board[lastMove.x][lastMove.y]) {
        winningCells = getWinningCells(board, lastMove.x, lastMove.y);
      }
      dispatch(setWinner({
        winner: data.result.winner,
        winnerMark: data.result.winnerMark,
        winningCells: winningCells,
      }));
      
      const winnerId = data.result.winner?.toString();
      const userStr = userId?.toString();
      
      if (winnerId === userStr) {
        resultType = 'win';
        resultMessage = 'Bạn thắng!';
      } else {
        resultType = 'lose';
        resultMessage = 'Bạn thua!';
      }
      
      const message = data.result.message || 'Game kết thúc!';
      if (lastGameEndMessageRef.current !== message) {
        lastGameEndMessageRef.current = message;
        toast.success(message);
      }
      
      if (winnerId === userStr) {
        playSound('win');
      } else {
        playSound('lose');
      }
    } else {
      dispatch(setDraw());
      resultType = 'draw';
      resultMessage = 'Hòa!';
      const message = 'Hòa!';
      if (lastGameEndMessageRef.current !== message) {
        lastGameEndMessageRef.current = message;
        toast.info(message);
      }
      playSound('draw');
    }
    
    // Đặt kết quả để hiển thị banner
    setGameResult(resultType);
    setGameResultMessage(resultMessage);
  }, [user, dispatch, stopPingInterval, stopTurnTimer]);

  // Reset flag khi bắt đầu game mới
  const resetGameEndFlags = useCallback(() => {
    gameEndProcessedRef.current = false;
    lastGameEndMessageRef.current = null;
    setGameResult(null);
    setGameResultMessage(null);
  }, []);

  // Setup listener cho game end
  const setupGameEndListener = useCallback(() => {
    gameSocket.onGameEnd(handleGameEnd);

    return () => {
      gameSocket.offGameEnd(handleGameEnd);
    };
  }, [handleGameEnd]);

  return {
    gameResult,
    gameResultMessage,
    handleGameEnd,
    resetGameEndFlags,
    setupGameEndListener,
  };
};

export default useGameRoomEnd;

