import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { socketClient } from '../services/socket/socketClient';
import { addNotification } from '../store/notificationSlice';
import { useAuth } from './useAuth';
import { playSound } from '../utils/soundManager';
import { toast } from 'react-toastify';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Lắng nghe tin nhắn mới
    const handleNewMessage = (messageData) => {
      const userId = user?.id || user?._id;
      const senderId = messageData.senderId?._id || messageData.senderId;
      const receiverId = messageData.receiverId?._id || messageData.receiverId;
      const userStr = userId?.toString();

      // Chỉ hiển thị notification nếu tin nhắn gửi cho user này
      if (receiverId?.toString() === userStr && senderId?.toString() !== userStr) {
        // Kiểm tra có đang ở trong chat với người gửi không
        const isInChatWithSender = location.pathname === `/chat/${senderId?.toString()}`;
        
        if (!isInChatWithSender) {
          const sender = messageData.sender || {};
          dispatch(addNotification({
            type: 'message',
            title: 'Tin nhắn mới',
            message: `${sender.nickname || sender.username || 'Người dùng'}: ${messageData.message}`,
            data: {
              senderId: senderId?.toString(),
              senderUsername: sender.username,
              senderNickname: sender.nickname,
            },
            timestamp: messageData.timestamp || messageData.createdAt,
          }));

          // Phát âm thanh
          const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
          if (soundEnabled) {
            playSound('message');
          }

          // Hiển thị toast
          toast.info(`Tin nhắn mới từ ${sender.nickname || sender.username || 'Người dùng'}`);
        }
      }
    };

    // Lắng nghe lời mời kết bạn mới
    const handleFriendRequest = (requestData) => {
      const requester = requestData.requester || {};
      dispatch(addNotification({
        type: 'friend_request',
        title: 'Lời mời kết bạn',
        message: `${requester.nickname || requester.username || 'Người dùng'} muốn kết bạn với bạn`,
        data: {
          requesterId: requestData.requester?._id || requestData.requester,
          requestId: requestData._id,
        },
        timestamp: requestData.createdAt || new Date().toISOString(),
      }));

      const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
      if (soundEnabled) {
        playSound('message');
      }

      toast.info(`Bạn có lời mời kết bạn mới từ ${requester.nickname || requester.username || 'Người dùng'}`);
    };

    // Lắng nghe lời mời vào phòng
    const handleRoomInvite = (inviteData) => {
      const inviter = inviteData.inviter || {};
      dispatch(addNotification({
        type: 'room_invite',
        title: 'Lời mời vào phòng',
        message: `${inviter.nickname || inviter.username || 'Người dùng'} mời bạn vào phòng "${inviteData.roomName || 'Phòng chơi'}"`,
        data: {
          roomId: inviteData.roomId,
          inviterId: inviteData.inviterId,
          roomName: inviteData.roomName,
        },
        timestamp: inviteData.timestamp || new Date().toISOString(),
      }));

      const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
      if (soundEnabled) {
        playSound('message');
      }

      toast.info(`${inviter.nickname || inviter.username || 'Người dùng'} mời bạn vào phòng`);
    };

    // Đăng ký listeners
    socketClient.on('message_received', handleNewMessage);
    socketClient.on('friend:requestReceived', handleFriendRequest);
    socketClient.on('room:invite', handleRoomInvite);

    return () => {
      socketClient.off('message_received', handleNewMessage);
      socketClient.off('friend:requestReceived', handleFriendRequest);
      socketClient.off('room:invite', handleRoomInvite);
    };
  }, [user, location.pathname, dispatch]);
};

export default useNotifications;

