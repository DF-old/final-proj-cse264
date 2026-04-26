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

        {!isPremium && (
          <div className="mb-6 bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Unlock Premium Features</p>
                <p className="text-xs text-gray-500">NBA, NFL, MLB scores, movie suggestions, and more.</p>
              </div>
            </div>
            <button
              onClick={upgradeToPremium}
              className="flex items-center gap-1.5 bg-linear-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              Upgrade Free
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">No events yet</h2>
            <p className="text-sm text-gray-400 mb-6">
              Create your first event and get enriched insights.
            </p>
            <button
              onClick={() => onNavigate('event-builder', null)}
              className="inline-flex items-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>
        ) : (
          <>
            {/* The event grid is clickable so users can jump back into editing
                without a separate detail screen. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading && <p className="text-sm text-gray-400 text-center py-8">Loading events...</p>}
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => onNavigate('event-builder', event)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {event.date} at {event.time}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, event.id)
                      }
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {event.location && (
                    <p className="text-xs text-gray-500 mb-3 truncate">{event.location}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full font-medium">
                        {event.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {event.attachedCards.length} card{event.attachedCards.length !== 1 ? 's' : ''} attached
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
export default Dashboard;
