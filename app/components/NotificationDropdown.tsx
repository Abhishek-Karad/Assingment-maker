'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, clearNotifications, removeNotification } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-slate-100 rounded-lg transition-all relative"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-lg border border-slate-200 z-50 overflow-hidden">
          {/* HEADER */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* NOTIFICATIONS LIST */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-slate-100 last:border-b-0 ${getBackgroundColor(
                    notification.type
                  )} border-0`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{notification.message}</p>
                      {notification.description && (
                        <p className="text-xs text-slate-600 mt-1">{notification.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="flex-shrink-0 p-1 hover:bg-slate-200 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
