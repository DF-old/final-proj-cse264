import {
  Cloud,
  CloudRain,
  Sun,
  Trophy,
  Film,
  Calendar,
  MapPin,
  AlertTriangle,
  Info,
  Lightbulb,
  Zap,
  Download,
  Plus,
  X,
} from 'lucide-react';
import type { Card, CardType, CardPriority } from '../event_types/card';

// Background and border color for each card type
const TYPE_COLORS: Record<CardType, string> = {
  weather: 'bg-sky-50 border-sky-200',
  nba: 'bg-amber-50 border-amber-200',
  nfl: 'bg-emerald-50 border-emerald-200',
  mlb: 'bg-rose-50 border-rose-200',
  movie: 'bg-amber-50 border-amber-200',
  holiday: 'bg-rose-50 border-rose-200',
  location: 'bg-teal-50 border-teal-200',
  export: 'bg-gray-50 border-gray-200',
};

// Icon background and text color for each badge type
const TYPE_BADGE: Record<CardType, string> = {
  weather: 'bg-sky-100 text-sky-700',
  nba: 'bg-amber-100 text-amber-700',
  nfl: 'bg-emerald-100 text-emerald-700',
  mlb: 'bg-rose-100 text-rose-700',
  movie: 'bg-amber-100 text-amber-700',
  holiday: 'bg-rose-100 text-rose-700',
  location: 'bg-teal-100 text-teal-700',
  export: 'bg-gray-100 text-gray-700',
};

// Badge color for each priority level
const PRIORITY_BADGE: Record<CardPriority, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-orange-100 text-orange-700',
  suggestion: 'bg-violet-100 text-violet-700',
  critical: 'bg-red-100 text-red-700',
};

// Render based on the card's icon string or type fallback
function CardIcon({ icon, type }: { icon: string | null; type: CardType }) {
  const cls = 'w-5 h-5';
  // Specific icon overrides
  if (icon === 'cloud-rain') return <CloudRain className={cls} />;
  if (icon === 'sun') return <Sun className={cls} />;
  if (icon === 'alert-triangle') return <AlertTriangle className={cls} />;
  if (icon === 'trophy') return <Trophy className={cls} />;
  if (icon === 'film') return <Film className={cls} />;
  if (icon === 'calendar') return <Calendar className={cls} />;
  if (icon === 'map-pin') return <MapPin className={cls} />;
  // Fallback icons based on card type
  if (type === 'weather') return <Cloud className={cls} />;
  if (type === 'nba') return <Trophy className={cls} />;
  if (type === 'nfl') return <Trophy className={cls} />;
  if (type === 'mlb') return <Trophy className={cls} />;
  if (type === 'movie') return <Film className={cls} />;
  if (type === 'holiday') return <Calendar className={cls} />;
  if (type === 'location') return <MapPin className={cls} />;
  // Default fallback icon
  return <Info className={cls} />;
}

// Render based on the priority level
function PriorityIcon({ priority }: { priority: CardPriority }) {
  const cls = 'w-3.5 h-3.5';
  if (priority === 'warning') return <AlertTriangle className={cls} />;
  if (priority === 'critical') return <Zap className={cls} />;
  if (priority === 'suggestion') return <Lightbulb className={cls} />;
  return <Info className={cls} />;
}

// Props for the CardItem component
interface CardItemProps {
  card: Card;
  onAttach?: (card: Card) => void;
  onDetach?: (card: Card) => void;
  attached?: boolean;
  compact?: boolean;
}

// Main component
export function CardItem({ card, onAttach, onDetach, attached, compact }: CardItemProps) {
  const colorClass = TYPE_COLORS[card.type];
  const badgeClass = TYPE_BADGE[card.type];
  const priorityClass = PRIORITY_BADGE[card.priority];

  return (
    <div className={`rounded-xl border ${colorClass} p-4 flex flex-col gap-3 transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`shrink-0 p-1.5 rounded-lg ${badgeClass}`}>
            <CardIcon icon={card.icon} type={card.type} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{card.title}</p>
            <p className="text-xs text-gray-500 truncate">{card.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onAttach && !attached && (
            <button
              onClick={() => onAttach(card)}
              className="p-1 rounded-lg bg-white border border-gray-200 hover:border-orange-400 hover:text-orange-500 transition-colors"
              title="Attach to event"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          {onDetach && attached && (
            <button
              onClick={() => onDetach(card)}
              className="p-1 rounded-lg bg-white border border-gray-200 hover:border-red-400 hover:text-red-500 transition-colors"
              title="Remove card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!compact && (
        <>
          {card.image && (
            <img
              src={card.image}
              alt={card.title}
              className="w-full h-28 object-cover rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}

          <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{card.summary}</p>

          <div className="grid grid-cols-2 gap-1.5">
            {card.fields.slice(0, 4).map((f, i) => (
              <div key={i} className="bg-white/70 rounded-lg px-2 py-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">
                  {f.label}
                </p>
                <p className="text-xs font-medium text-gray-800 truncate">{f.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}`}>
              <PriorityIcon priority={card.priority} />
              {card.priority}
            </span>
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 border border-gray-200 text-gray-600"
              >
                {tag}
              </span>
            ))}
            <span className="ml-auto text-[10px] text-gray-400">{card.source}</span>
          </div>
        </>
      )}
    </div>
  );
}
