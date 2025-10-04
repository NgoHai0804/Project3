import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { socketClient } from '../../services/socket/socketClient';
import { addMessage, setMessages, markAllAsRead } from '../../store/chatSlice';
import { SOCKET_EVENTS } from '../../utils/constants';
import { playSound } from '../../utils/soundManager';

const ChatBox = ({ roomId }) => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const { messages } = useSelector((state) => state.chat);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const endElement = messagesEndRef.current;
      
      if (smooth) {
        endElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // Tự động cuộn xuống khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      let timer;
      requestAnimationFrame(() => {
        timer = setTimeout(() => {
          scrollToBottom(true);
        }, 100);
      });
      
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [messages]);

  // Tải lịch sử chat khi component được mount
  useEffect(() => {
    if (!roomId) return;

    // Hàm tải tin nhắn từ server
    const loadMessages = () => {
      socketClient.emit(SOCKET_EVENTS.GET_ROOM_MESSAGES, { roomId, limit: 50 });
    };

    loadMessages();

    // Xử lý khi nhận được danh sách tin nhắn của phòng
    const handleRoomMessages = (data) => {
      if (data.roomId === roomId) {
        dispatch(setMessages(data.messages || []));
        dispatch(markAllAsRead());
        // Cuộn xuống cuối sau khi tải lịch sử
        setTimeout(() => scrollToBottom(true), 300);
      }
    };

    // Xử lý khi nhận được tin nhắn mới
    const handleMessageReceived = (messageData) => {
      if (messageData.roomId === roomId) {
        dispatch(addMessage({
          _id: messageData._id,
          message: messageData.message,
          type: messageData.type,
          senderId: messageData.senderId?._id || messageData.senderId,
          sender: messageData.sender,
          roomId: messageData.roomId,
          isRead: messageData.isRead,
          createdAt: messageData.createdAt,
          timestamp: messageData.timestamp,
        }));
        // Tự động cuộn sau khi thêm tin nhắn mới
        requestAnimationFrame(() => {
          setTimeout(() => {
            scrollToBottom(true);
          }, 150);
        });
      }
    };

    // Xử lý lỗi chat
    const handleChatError = (data) => {
      console.error('Lỗi chat:', data.message);
    };

    socketClient.on(SOCKET_EVENTS.ROOM_MESSAGES, handleRoomMessages);
    socketClient.on(SOCKET_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
    socketClient.on(SOCKET_EVENTS.CHAT_ERROR, handleChatError);

    return () => {
      socketClient.off(SOCKET_EVENTS.ROOM_MESSAGES, handleRoomMessages);
      socketClient.off(SOCKET_EVENTS.MESSAGE_RECEIVED, handleMessageReceived);
      socketClient.off(SOCKET_EVENTS.CHAT_ERROR, handleChatError);
    };
  }, [roomId, dispatch]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !roomId) return;

    // Gửi tin nhắn qua socket
    socketClient.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      roomId,
      message: inputMessage.trim(),
      type: 'text',
    });

    setInputMessage('');
    playSound('message');
  };

  // Format thời gian
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Kiểm tra tin nhắn có phải của mình không
  const isMyMessage = (senderId) => {
    const userId = user?.id || user?._id;
    return (senderId?.toString() === userId?.toString());
  };

  return (
    <div 
      className="bg-white rounded-lg shadow flex flex-col overflow-hidden max-h-[70vh] sm:max-h-full" 
      style={{ 
        height: '100%', 
        minHeight: 0,
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      <div className="pt-2 sm:pt-3 px-3 pb-3 border-b border-gray-200" style={{ flexShrink: 0, flexGrow: 0 }}>
        <h3 className="text-sm sm:text-base font-semibold">Chat phòng</h3>
      </div>
      
      <div 
        ref={messagesContainerRef}
        className="p-3 space-y-2"
        style={{ 
          flex: '1 1 0%',
          minHeight: 0,
          maxHeight: '100%',
          height: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          position: 'relative'
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
          </div>
        ) : (
          messages.map((msg) => {
            const myMessage = isMyMessage(msg.senderId);
            return (
              <div
                key={msg._id || msg.timestamp}
                className={`flex ${myMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    myMessage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {!myMessage ? (
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold opacity-75">
                        {msg.sender?.nickname || msg.sender?.username || 'Người chơi'}
                      </span>
                      <span className="text-xs opacity-60">
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end mb-1">
                      <span className="text-xs opacity-75">
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className="text-sm break-words">{msg.message}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200" style={{ flexShrink: 0, flexGrow: 0 }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            Gửi
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
