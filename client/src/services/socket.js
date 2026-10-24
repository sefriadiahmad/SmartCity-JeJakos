import { io } from 'socket.io-client';

const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || rawApi.replace(/\/api\/?$/, '');

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

export function connectSocket(token) {
  const authToken = token || localStorage.getItem('token');
  if (!authToken) return socket;
  socket.auth = { token: authToken };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}

export function joinConversation(conversationId) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      resolve({ success: false, offline: true });
      return;
    }
    socket.emit('joinConversation', { conversationId }, (res) => {
      if (res && res.success) resolve(res);
      else reject(new Error(res?.error || 'Gagal masuk room percakapan'));
    });
  });
}

export function leaveConversation(conversationId) {
  if (socket.connected) {
    socket.emit('leaveConversation', { conversationId });
  }
}

export function sendSocketMessage(conversationId, content) {
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      reject(new Error('Socket disconnected'));
      return;
    }
    socket.emit('sendMessage', { conversationId, content }, (res) => {
      if (res && res.success) resolve(res.message);
      else reject(new Error(res?.error || 'Gagal mengirim pesan'));
    });
  });
}

export function markSocketRead(conversationId) {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ success: false });
      return;
    }
    socket.emit('markRead', { conversationId }, (res) => {
      resolve(res || { success: true });
    });
  });
}
