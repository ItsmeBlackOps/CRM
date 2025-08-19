import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/lib/socketClient';

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rehydrates user from token', () => {
    const payload = btoa(JSON.stringify({ sub: 'u1', role: 'user' }));
    localStorage.setItem('token', `header.${payload}.sig`);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>
        <SocketProvider>
          <AuthProvider>{children}</AuthProvider>
        </SocketProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user?.userId).toBe('u1');
    expect(result.current.user?.role).toBe('user');
  });
});
