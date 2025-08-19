import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SocketProvider } from './lib/socketClient';
import { AuthProvider } from './contexts/auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <SocketProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SocketProvider>
  </QueryClientProvider>
);
