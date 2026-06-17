import { useState, useEffect, useRef } from 'react';
import { getNotifications } from '../store';
import { Notification } from '../types';
import { Bell, AlertTriangle, Info, AlertCircle, X } from 'lucide-react';

interface NotificationsBellProps {
  onNavigate: (page: string) => void;
}

export default function NotificationsBell({ onNavigate }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(getNotifications());
    // Refresh every minute
    const interval = setInterval(() => setNotifications(getNotifications()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'danger': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'danger': return 'bg-red-50 border-red-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const handleClick = (notification: Notification) => {
    if (notification.link) {
      onNavigate(notification.link);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition"
      >
        <Bell size={20} className="text-gray-600" />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <h3 className="font-bold text-sm text-gray-800">الإشعارات</h3>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 rounded-lg">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <Bell size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">لا توجد إشعارات</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 p-3 border-b last:border-0 hover:bg-gray-50 transition text-right ${n.link ? 'cursor-pointer' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
