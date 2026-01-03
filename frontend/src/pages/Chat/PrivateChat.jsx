import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { socketClient } from '../../services/socket/socketClient';
import { chatApi } from '../../services/api/chatApi';
import { toast } from 'react-toastify';
import { SOCKET_EVENTS } from '../../utils/constants';
import { playSound } from '../../utils/soundManager';

const PrivateChat = () => {
  const { id: friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [friend, setFriend] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  
  const loadingChatRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const currentFriendIdRef = useRef(null);

  useEffect(() => {
    if (!friendId) {
      navigate('/friends');
      return;
    }
    
    if (currentFriendIdRef.current !== friendId) {
      hasLoadedRef.current = false;
      currentFriendIdRef.current = friendId;
    }
    
    if (hasLoadedRef.current) {
      setupSocketListeners();
      return;
    }
    
    hasLoadedRef.current = true;
    loadChatHistory();
    setupSocketListeners();

    return () => {
      socketClient.off(SOCKET_EVENTS.MESSAGE_RECEIVED);
      socketClient.off(SOCKET_EVENTS.PRIVATE_MESSAGES);
      socketClient.off(SOCKET_EVENTS.CHAT_ERROR);
    };
  }, [friendId]);

  const loadChatHistory = async () => {
    // Tránh gọi trùng nếu đang load
    if (loadingChatRef.current) {
      return;
    }
    
    loadingChatRef.current = true;
    try {
      setLoading(true);
      
      // Tải từ API trước để có thông tin bạn bè và tin nhắn
      try {
        const data = await chatApi.getPrivateChat(friendId);
        console.log('Phản hồi từ Chat API:', data);
        
        if (data) {
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages);
          }
          if (data.friend) {
            setFriend(data.friend);
          }
        }
      } catch (apiError) {
        console.error('Lỗi API:', apiError);
        // Nếu API lỗi, vẫn tiếp tục với socket
      }
      
      // Cũng tải từ socket để có cập nhật realtime
      socketClient.emit(SOCKET_EVENTS.GET_PRIVATE_MESSAGES, { userId: friendId, limit: 50 });
    } catch (error) {
      toast.error('Không thể tải lịch sử chat');
      console.error('Lỗi khi tải lịch sử chat:', error);
    } finally {
      setLoading(false);
      loadingChatRef.current = false;
    }
  };

  const setupSocketListeners = () => {
    const handleMessageReceived = (messageData) => {
      const userId = user?.id || user?._id;
      const senderId = messageData.senderId?._id || messageData.senderId;
      const receiverId = messageData.receiverId?._id || messageData.receiverId;
      const userStr = userId?.toString();
      const friendIdStr = friendId?.toString();
      
      // Kiểm tra tin nhắn có liên quan đến cuộc trò chuyện này không
      if ((senderId?.toString() === userStr && receiverId?.toString() === friendIdStr) ||
          (senderId?.toString() === friendIdStr && receiverId?.toString() === userStr)) {
        setMessages(prev => [...prev, messageData]);
        scrollToBottom();
      }
    };

    // Xử lý khi nhận được tin nhắn riêng từ socket
    const handlePrivateMessages = (data) => {
      console.log('Đã nhận tin nhắn riêng:', data);
      const friendIdStr = friendId?.toString();
      const dataUserId = data.userId?.toString();
      
      // Chỉ cập nhật nếu tin nhắn từ đúng người bạn
      if (dataUserId === friendIdStr) {
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
          scrollToBottom();
        }
      }
    };

    const handleChatError = (data) => {
      toast.error(data.message || 'Lỗi chat');
    };

    socketClient.on(SOCKET_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
    socketClient.on(SOCKET_EVENTS.PRIVATE_MESSAGES, handlePrivateMessages);
    socketClient.on(SOCKET_EVENTS.CHAT_ERROR, handleChatError);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !friendId) return;

    socketClient.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      roomId: null,
      receiverId: friendId,
      message: inputMessage.trim(),
      type: 'text',
    });
    playSound('message');

    setInputMessage('');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const isMyMessage = (senderId) => {
    const userId = user?.id || user?._id;
    return (senderId?.toString() === userId?.toString());
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/friends')}
              className="text-gray-600 hover:text-gray-800"
            >
              ← Quay lại
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {friend?.avatarUrl ? (
                <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">
                  {friend?.nickname?.[0]?.toUpperCase() || friend?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div>
              <div className="font-semibold">{friend?.nickname || friend?.username || 'Người dùng'}</div>
              <div className="text-sm text-gray-500">@{friend?.username}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
          </div>
        ) : (
          messages.map((msg) => {
            const myMessage = isMyMessage(msg.senderId?._id || msg.senderId);
            return (
              <div
                key={msg._id || msg.timestamp}
                className={`flex ${myMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    myMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-800 shadow'
                  }`}
                >
                  {!myMessage && (
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {msg.sender?.nickname || msg.sender?.username || 'Người dùng'}
                    </div>
                  )}
                  <div className="text-sm break-words">{msg.message}</div>
                  <div className={`text-xs mt-1 ${myMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                    {formatTime(msg.timestamp || msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gửi
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrivateChat;
