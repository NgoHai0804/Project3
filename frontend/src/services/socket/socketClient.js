import { io } from 'socket.io-client';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import { SOCKET_URL } from '../../config/api.config';

class SocketClient {
    socket = null;
    pingInterval = null;
    allListeners = new Map(); // Theo dõi listeners để cleanup sau
    eventQueue = []; // Queue events khi socket chưa kết nối

    // Kết nối socket với server
    connect() {
        let token = storage.get(STORAGE_KEYS.TOKEN);
        
        // Kiểm tra token có tồn tại không
        if (!token) {
            console.warn('Không tìm thấy token, không thể kết nối socket');
            this.forceDisconnect(); // Đóng socket cũ nếu có
            return;
        }

        // Xử lý token: loại bỏ dấu ngoặc kép nếu có
        if (typeof token === 'string') {
            token = token.replace(/^"(.*)"$/, '$1').trim();
        }

        // Kiểm tra token sau khi xử lý
        if (!token || token === 'null' || token === 'undefined') {
            console.warn('Token không hợp lệ, không thể kết nối socket');
            this.forceDisconnect(); // Đóng socket cũ nếu có
            return;
        }

        // Đóng socket cũ trước khi tạo mới để tránh trùng lặp
        if (this.socket) {
            const currentToken = this.socket.auth?.token;
            if (currentToken !== token) {
                this.forceDisconnect();
            } else if (this.socket.connected) {
                console.log('Socket đã được kết nối với token giống nhau, đang kiểm tra trùng lặp...');
                // Kiểm tra socket trùng lặp bằng cách đếm số listeners
                const listenerCount = this.socket.listeners('connect').length;
                if (listenerCount > 5) {
                    console.warn(`Phát hiện quá nhiều listeners (${listenerCount}), đang kết nối lại...`);
                    this.forceDisconnect();
                } else {
                    return; // Đã có socket connected, không cần tạo mới
                }
            } else {
                // Socket tồn tại nhưng chưa kết nối, đóng nó đi
                this.forceDisconnect();
            }
        }

        // Tạo socket mới
        console.log('Đang tạo kết nối socket mới đến:', SOCKET_URL);
        this.socket = io(SOCKET_URL, {
            autoConnect: false,
            withCredentials: true,
            auth: {
                token: token,
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling'],
            reconnectionDelayMax: 5000,
        });

        // Cleanup listeners cũ trước khi thêm mới
        this.allListeners.clear();

        // Thêm event listeners và theo dõi để cleanup sau
        const connectHandler = () => {
            // Gửi các events đã queue khi socket kết nối
            this.flushEventQueue();
            // Tự động kết nối lại vào phòng khi socket kết nối lại
            if (this.onReconnectCallback) {
                this.onReconnectCallback();
            }
        };
        this.socket.on('connect', connectHandler);
        this.allListeners.set('connect', connectHandler);

        const connectErrorHandler = (error) => {
            console.error('Lỗi kết nối socket:', error.message);
        };
        this.socket.on('connect_error', connectErrorHandler);
        this.allListeners.set('connect_error', connectErrorHandler);

        const disconnectHandler = (reason) => {
            console.log('Socket đã ngắt kết nối:', reason);
            // Xóa queue khi disconnect (trừ khi server disconnect)
            if (reason !== 'io server disconnect') {
                this.eventQueue = [];
            }
        };
        this.socket.on('disconnect', disconnectHandler);
        this.allListeners.set('disconnect', disconnectHandler);

        const errorHandler = (error) => {
            console.error('Lỗi socket:', error);
        };
        this.socket.on('error', errorHandler);
        this.allListeners.set('error', errorHandler);

        // Ping/Pong để giữ kết nối sống với server
        const pongHandler = (data) => {
        };
        this.socket.on('pong_server', pongHandler);
        this.allListeners.set('pong_server', pongHandler);
        
        // Thực hiện kết nối nếu chưa connected
        if (!this.socket.connected) {
            this.socket.connect();
        }

        this.startPingInterval();
    }

    // Gửi ping định kỳ để giữ kết nối với server
    startPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.connected) {
                this.socket.emit('ping_server');
            }
        }, 5000);
    }

    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    disconnect() {
        this.forceDisconnect();
    }

    // Buộc ngắt kết nối socket
    forceDisconnect() {
        this.stopPingInterval();
        this.eventQueue = [];
        
        if (this.socket) {
            // Xóa tất cả listeners trước khi ngắt kết nối
            this.allListeners.forEach((handler, event) => {
                try {
                    this.socket.off(event, handler);
                } catch (e) {
                    console.warn('Lỗi khi xóa listener:', event, e);
                }
            });
            this.allListeners.clear();

            // Ngắt kết nối socket
            try {
                if (this.socket.connected) {
                    this.socket.disconnect();
                }
                // Xóa tất cả listeners còn lại
                this.socket.removeAllListeners();
            } catch (e) {
                console.warn('Lỗi khi ngắt kết nối socket:', e);
            }
            
            this.socket = null;
        }
    }

    // Gửi các events đã queue khi socket kết nối
    flushEventQueue() {
        if (this.eventQueue.length > 0 && this.socket && this.socket.connected) {
            this.eventQueue.forEach(({ event, data }) => {
                this.socket.emit(event, data);
            });
            this.eventQueue = [];
        }
    }

    // Gửi event đến server
    emit(event, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        } else {
            // Queue event để gửi sau khi socket kết nối (chỉ với events quan trọng)
            const queueableEvents = ['join_room', 'get_room_messages', 'check_reconnect'];
            if (queueableEvents.includes(event)) {
                this.eventQueue.push({ event, data });
            } else {
                console.warn('Socket chưa kết nối, không thể gửi event:', { 
                    event, 
                    data, 
                    hasSocket: !!this.socket, 
                    isConnected: this.socket?.connected,
                    socketId: this.socket?.id 
                });
            }
        }
    }

    // Đăng ký listener cho event
    on(event, callback) {
        if (this.socket) {
            // Tránh trùng lặp listener
            const key = `${event}_${callback?.toString() || 'anonymous'}`;
            if (this.allListeners.has(key)) {
                console.warn(`Listener đã tồn tại cho ${event}, đang xóa listener cũ trước...`);
                this.off(event, this.allListeners.get(key));
            }
            
            this.socket.on(event, callback);
            // Theo dõi listener để cleanup sau
            this.allListeners.set(key, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            if (callback) {
                this.socket.off(event, callback);
                const key = `${event}_${callback?.toString() || 'anonymous'}`;
                this.allListeners.delete(key);
            } else {
                // Xóa tất cả listeners của event này
                this.socket.off(event);
                const keysToDelete = [];
                this.allListeners.forEach((_, key) => {
                    if (key.startsWith(event + '_')) {
                        keysToDelete.push(key);
                    }
                });
                keysToDelete.forEach(key => this.allListeners.delete(key));
            }
        }
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }

    getSocket() {
        return this.socket;
    }

    onReconnect(callback) {
        this.onReconnectCallback = callback;
    }
}

export const socketClient = new SocketClient();
