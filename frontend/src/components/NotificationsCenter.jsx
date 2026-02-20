
import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck,
  Inbox,
  Trash2
} from 'lucide-react';

export default function NotificationsCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const saved = localStorage.getItem('dblens_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notifications');
      }
    }
  }, []);

  const saveNotifications = (notifs) => {
    setNotifications(notifs);
    localStorage.setItem('dblens_notifications', JSON.stringify(notifs));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = (id) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const deleteNotification = (id) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {
}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-gray-200/50 dark:border-white/10 transition-all"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {
}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 dark:shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {
}
          <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {notifications.length === 0 ? 'No notifications' : 
                 unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {
}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                  <Inbox className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Notifications will appear here when events occur
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200/50 dark:divide-white/10">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`group px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeStyles(notification.type)}`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {notification.time}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const addNotification = (notification) => {
  const saved = localStorage.getItem('dblens_notifications');
  const notifications = saved ? JSON.parse(saved) : [];
  
  const newNotification = {
    id: Date.now(),
    type: 'info',
    read: false,
    time: 'Just now',
    ...notification,
  };
  
  const updated = [newNotification, ...notifications.slice(0, 49)];
  localStorage.setItem('dblens_notifications', JSON.stringify(updated));
  
  window.dispatchEvent(new CustomEvent('notification-added'));
};

