import { useEffect } from 'react';
import { socketClient } from '../services/socket/socketClient';
import { useAuth } from './useAuth';

export const useSocket = () => {
  const { isAuthenticated, token } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketClient.connect();

      return () => {
        // Cleanup khi unmount
      };
    } else {
      socketClient.forceDisconnect();
    }
  }, [isAuthenticated, token]);

  return {
    socket: socketClient.getSocket(),
    isConnected: socketClient.isConnected(),
    emit: socketClient.emit.bind(socketClient),
    on: socketClient.on.bind(socketClient),
    off: socketClient.off.bind(socketClient),
  };
};

export default useSocket;
