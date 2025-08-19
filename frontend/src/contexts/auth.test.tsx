import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocketProvider } from '@/lib/socketClient';

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('rehydrates user from token', async () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'u1', role: 'user' }),
    ).toString('base64url');
    const header = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    localStorage.setItem('token', `${header}.${payload}.sig`);
    const qc = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={qc}>
        <SocketProvider>
          <AuthProvider>{children}</AuthProvider>
        </SocketProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.userId).toBe('u1'));
    expect(result.current.user?.role).toBe('user');
  });
});
