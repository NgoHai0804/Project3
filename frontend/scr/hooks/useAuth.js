import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout as logoutAction, updateProfile as updateProfileAction } from '../store/userSlice';
import { storage, STORAGE_KEYS } from '../utils/storage';
import { socketClient } from '../services/socket/socketClient';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, loading, error } = useSelector((state) => state.user);

  const logout = () => {
    dispatch(logoutAction());
    socketClient.forceDisconnect();
    navigate('/auth/login');
  };

  const updateUser = (userData) => {
    dispatch(updateProfileAction(userData));
  };

  const getToken = () => {
    return token || storage.get(STORAGE_KEYS.TOKEN);
  };

  const getUser = () => {
    return user || storage.get(STORAGE_KEYS.USER);
  };

  return {
    user: getUser(),
    token: getToken(),
    isAuthenticated,
    loading,
    error,
    logout,
    updateUser,
  };
};

export default useAuth;
