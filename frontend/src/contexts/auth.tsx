import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import socketClient, { connectSocket, emitAndWait, useSocketStatus } from '@/lib/socketClient';
import { jwtDecode } from 'jwt-decode';
import { AuthOk, ListsData } from '@/types';

interface UserInfo {
  userId: string;
  role: AuthOk['role'];
  branchId?: string;
  departmentId?: string;
  teamId?: string;
}

interface AuthContextValue {
  user?: UserInfo;
  token?: string;
  status: ReturnType<typeof useSocketStatus>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const status = useSocketStatus();
  const [user, setUser] = useState<UserInfo>();
  const [token, setToken] = useState<string>();
  const qc = useQueryClient();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        setToken(storedToken);
        const payload = jwtDecode<{ sub?: string; id?: string; role: AuthOk['role']; branchId?: string; departmentId?: string; teamId?: string }>(storedToken);
        setUser({
          userId: payload.sub || (payload as { id?: string }).id!,
          role: payload.role,
          branchId: payload.branchId,
          departmentId: payload.departmentId,
          teamId: payload.teamId,
        });
        connectSocket(storedToken);
      } catch {
        localStorage.removeItem('token');
      }
    } else if (!socketClient.socket.connected) {
      socketClient.socket.connect();
    }
  }, []);

  useEffect(() => {
    if (status === 'connected' && user) {
      const key = ['orgLists', user.branchId, user.departmentId];
      const state = qc.getQueryState(key);
      if (!state || state.isStale) {
        qc.invalidateQueries({ queryKey: key });
      }
    }
  }, [status, user, qc]);

  async function login(email: string, password: string) {
    if (!socketClient.socket.connected) socketClient.socket.connect();
    const res: AuthOk = await new Promise((resolve, reject) => {
      const onOk = (data: AuthOk) => {
        cleanup();
        resolve(data);
      };
      const onErr = (err: unknown) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        socketClient.socket.off('auth:ok', onOk);
        socketClient.socket.off('auth:error', onErr);
      };
      socketClient.socket.on('auth:ok', onOk);
      socketClient.socket.on('auth:error', onErr);
      socketClient.socket.emit('auth:login', { email, password });
    });
    localStorage.setItem('token', res.token);
    localStorage.setItem('role', res.role);
    setToken(res.token);
    setUser({
      userId: res.userId,
      role: res.role,
      branchId: res.branchId,
      departmentId: res.departmentId,
      teamId: res.teamId,
    });
    connectSocket(res.token);
    await qc.fetchQuery({
      queryKey: ['orgLists', res.branchId, res.departmentId],
      queryFn: () =>
        emitAndWait<unknown, ListsData>('lists:bootstrap', {}, 'lists:data'),
      staleTime: 10 * 60 * 1000,
    });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setUser(undefined);
    setToken(undefined);
    socketClient.socket.disconnect();
  }

  const value: AuthContextValue = { user, token, status, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
