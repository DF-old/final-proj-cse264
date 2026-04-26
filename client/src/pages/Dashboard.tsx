import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CalendarDays, Crown, Sparkles, ChevronRight } from 'lucide-react';
import type { EventDraft } from '../event_types/event';
import { useAuth } from '../auth/Auth';
import API from '../lib/server';

interface Props {
  onNavigate: (page: string, data?: unknown) => void;
}

export function Dashboard({ onNavigate }: Props) {
  const { user, upgradeToPremium } = useAuth();
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Events are fetched per user so the dashboard only shows the current
      // session's saved planning data.
      const res = await fetch(`${API}/events?userId=${user.id}`);
      if (res.ok) setEvents(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const res = await fetch(`${API}/events/${id}`, { method: 'DELETE' });
      if (res.ok) setEvents(prev => prev.filter(ev => ev.id !== id));
    } catch { 
      window.alert('Failed to delete event.');
     }
  };

  if (!user) return null;

  const isPremium = user.tier === 'premium';

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.username}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {events.length === 0
                ? 'No events yet. Create your first one!'
                : `${events.length} event${events.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <button
            onClick={() => onNavigate('event-builder', null)}
            className="flex items-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-100"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>

        
      </div>
    </div>
  );
}
export default Dashboard;
