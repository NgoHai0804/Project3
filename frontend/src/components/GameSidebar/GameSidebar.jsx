import React from 'react';
import PlayerList from '../PlayerList/PlayerList';
import ChatBox from '../ChatBox/ChatBox';
import MoveHistory from '../MoveHistory/MoveHistory';

const GameSidebar = ({ roomId, playerMarks, history, currentRoom, isHost, isPlaying }) => {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 h-full" style={{ minHeight: 0, height: '100%', overflow: 'hidden' }}>
      {/* PlayerList - Hiển thị trên cả mobile và desktop, ở trên cùng */}
      <div className="flex-shrink-0">
        <PlayerList 
          playerMarks={playerMarks} 
          currentRoom={currentRoom}
          isHost={isHost}
          roomId={roomId}
          isPlaying={isPlaying}
        />
      </div>
      
      {/* Chat Box - Luôn hiển thị trong sidebar, bên dưới PlayerList */}
      <div 
        className="min-h-0 overflow-hidden" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          flex: '3 1 0%',
          maxHeight: '100%'
        }}
      >
        <ChatBox roomId={roomId} />
      </div>
      
      {/* Lịch sử nước đi - Luôn hiển thị trong sidebar, bên dưới ChatBox */}
      <div 
        className="min-h-0 overflow-hidden" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column',
          flex: '3 1 0%',
          maxHeight: '100%'
        }}
      >
        <MoveHistory history={history} />
      </div>
    </div>
  );
};

export default GameSidebar;
