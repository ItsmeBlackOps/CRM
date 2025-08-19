import { useMemo } from 'react';
import socketClient from '@/lib/socketClient';

export function useSocket() {
  return useMemo(() => socketClient.socket, []);
}
