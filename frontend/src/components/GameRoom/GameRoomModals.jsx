import React from 'react';
import PasswordModal from '../PasswordModal/PasswordModal';
import DrawRequestModal from '../DrawRequestModal/DrawRequestModal';
import SurrenderModal from '../SurrenderModal/SurrenderModal';
import RoomSettingsModal from '../RoomSettingsModal/RoomSettingsModal';
import LeaveRoomModal from '../LeaveRoomModal/LeaveRoomModal';

const GameRoomModals = ({
  showPasswordModal,
  roomId,
  roomInfo,
  handlePasswordSubmit,
  handlePasswordCancel,
  showDrawModal,
  drawRequestInfo,
  user,
  handleDrawAccept,
  handleDrawReject,
  handleDrawCancel,
  showSurrenderModal,
  handleCancelSurrender,
  handleConfirmSurrender,
  showRoomSettingsModal,
  setShowRoomSettingsModal,
  handleSaveRoomSettings,
  currentRoom,
  playerMarks,
  turnTimeLimit,
  firstTurn,
  showLeaveRoomModal,
  handleCancelLeaveRoom,
  handleConfirmLeaveRoom,
  isPlaying
}) => {
  return (
    <>
      {/* Password Modal */}
      <PasswordModal
        isOpen={showPasswordModal && !!roomId}
        onClose={handlePasswordCancel}
        onSubmit={handlePasswordSubmit}
        roomName={roomInfo?.name || 'Phòng chơi'}
        roomId={roomId}
      />

      {/* Draw Request Modal */}
      <DrawRequestModal
        isOpen={showDrawModal && !!drawRequestInfo}
        onClose={() => {
          // Modal sẽ được đóng bởi handlers
        }}
        onAccept={handleDrawAccept}
        onReject={handleDrawReject}
        onCancel={handleDrawCancel}
        requesterUsername={drawRequestInfo?.requesterUsername}
        requesterNickname={drawRequestInfo?.requesterNickname}
        isRequester={
          drawRequestInfo && (user?.id || user?._id)?.toString() === drawRequestInfo.requesterId?.toString()
        }
      />

      {/* Surrender Modal */}
      <SurrenderModal
        isOpen={showSurrenderModal}
        onClose={handleCancelSurrender}
        onConfirm={handleConfirmSurrender}
      />

      {/* Room Settings Modal */}
      <RoomSettingsModal
        isOpen={showRoomSettingsModal}
        onClose={() => setShowRoomSettingsModal(false)}
        onSave={(settings) => {
          handleSaveRoomSettings(settings);
          setShowRoomSettingsModal(false);
        }}
        players={currentRoom?.players || []}
        currentPlayerMarks={playerMarks}
        currentTurnTimeLimit={turnTimeLimit}
        currentFirstTurn={firstTurn}
      />

      {/* Leave Room Modal */}
      <LeaveRoomModal
        isOpen={showLeaveRoomModal}
        onClose={handleCancelLeaveRoom}
        onConfirm={handleConfirmLeaveRoom}
        isPlaying={isPlaying}
      />
    </>
  );
};

export default GameRoomModals;
