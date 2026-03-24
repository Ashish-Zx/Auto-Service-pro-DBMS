import React, { createContext, useContext, useMemo, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine, RiInformationLine } from 'react-icons/ri';

const ToastContext = createContext(null);

const ICONS = {
  success: <RiCheckLine size={16} />,
  error: <RiErrorWarningLine size={16} />,
  info: <RiInformationLine size={16} />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  };

  const pushToast = ({ type = 'info', message }) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => removeToast(id), 3500);
  };

  const value = useMemo(() => ({
    success: (message) => pushToast({ type: 'success', message }),
    error: (message) => pushToast({ type: 'error', message }),
    info: (message) => pushToast({ type: 'info', message }),
  }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
            <span className="toast-message">{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              <RiCloseLine size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return context;
}
