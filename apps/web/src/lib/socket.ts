import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export const getSocket = async (): Promise<Socket> => {
  if (socket) {
    return socket;
  }

  const token = await getToken();

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: {
      token,
    },
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Connected to real-time events gateway');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time events gateway');
  });

  return socket;
};
