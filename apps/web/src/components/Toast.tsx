'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

/* ── Toast Container ─────────────────────────────────────────────────── */

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    icon: '#10b981',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: '#ef4444',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: '#f59e0b',
  },
  info: {
    bg: 'rgba(99, 102, 241, 0.12)',
    border: 'rgba(99, 102, 241, 0.3)',
    icon: '#6366f1',
  },
};

function ToastContainer({
  toasts,
  dismissToast,
}: {
  toasts: Toast[];
  dismissToast: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '400px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const colors = TOAST_COLORS[toast.type];
  const icon = TOAST_ICONS[toast.type];

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: colors.bg,
        backdropFilter: 'blur(16px)',
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        animation: 'toastSlideIn 0.3s ease-out',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#fff',
          background: colors.icon,
        }}
      >
        {icon}
      </span>

      <span
        style={{
          flex: 1,
          fontSize: '0.8125rem',
          lineHeight: 1.5,
          color: '#e2e8f0',
        }}
      >
        {toast.message}
      </span>

      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '1rem',
          lineHeight: 1,
          padding: '0',
          transition: 'color 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = '#e2e8f0')}
        onMouseOut={(e) => (e.currentTarget.style.color = '#64748b')}
        aria-label="Dismiss toast"
      >
        ×
      </button>

      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
