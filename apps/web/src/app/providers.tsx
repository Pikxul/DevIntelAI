'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
