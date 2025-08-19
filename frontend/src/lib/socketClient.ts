import { io, Socket } from 'socket.io-client';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'error' | 'disconnected';

const socket: Socket = io('/', {
  autoConnect: false,
  transports: ['websocket'],
  reconnectionDelayMax: 10000,
});

const subscriptions = new Map<string, Set<(...args: unknown[]) => void>>();

export function connectSocket(token: string) {
  socket.auth = { token };
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}

export function emitWithAck<TReq, TRes>(event: string, payload: TReq, timeout = 5000): Promise<TRes> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    socket.emit(event, payload, (res: TRes) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

export function onEvent<T>(event: string, cb: (payload: T) => void) {
  let set = subscriptions.get(event);
  if (!set) {
    set = new Set<(...args: unknown[]) => void>();
    subscriptions.set(event, set);
  }
  const wrapped = cb as unknown as (...args: unknown[]) => void;
  set.add(wrapped);
  socket.on(event, wrapped as (...args: unknown[]) => void);
}

socket.on('reconnect', () => {
  subscriptions.forEach((cbs, event) => {
    cbs.forEach((cb) => socket.on(event, cb));
  });
});

const SocketStatusContext = createContext<ConnectionStatus>('disconnected');

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  useEffect(() => {
    socket.on('connect', () => setStatus('connected'));
    socket.on('reconnect_attempt', () => setStatus('reconnecting'));
    socket.on('reconnect', () => setStatus('connected'));
    socket.on('connect_error', () => setStatus('error'));
    socket.on('disconnect', () => setStatus('reconnecting'));
    const token = localStorage.getItem('token');
    if (token) connectSocket(token);
    return () => {
      socket.off('connect');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, []);
  return React.createElement(SocketStatusContext.Provider, { value: status }, children);
}

export function useSocketStatus() {
  return useContext(SocketStatusContext);
}

export function useSocket() {
  return socket;
}

export default { socket, connectSocket, emitWithAck, onEvent };
