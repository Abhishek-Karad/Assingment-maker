'use client';

import React, { createContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  timestamp: Date;
  description?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', message: string, description?: string) => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', message: string, description?: string) => {
      const id = Date.now().toString();
      const notification: Notification = {
        id,
        type,
        message,
        timestamp: new Date(),
        description,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 10)); // Keep last 10 notifications

      // Also show sonner toast
      toast[type](message, {
        description,
      });

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        clearNotifications,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
