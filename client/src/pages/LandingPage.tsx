import { Cloud, Trophy, Film, MapPin, Calendar, Download, Sparkles, ArrowRight, Crown } from 'lucide-react';

interface LandingPageProps {
    onNavigate: (page: string) => void;
}

const features = [
    {
        icon: Cloud,
        title: 'Live Weather',
        desc: 'Get real-time forecasts for your event date and location.',
        tier: 'free',
    },
    {
        icon: Trophy,
        title: 'League Scores',
        desc: 'Check NBA, NFL, and MLB schedules to avoid conflicts or plan watch parties.',
        tier: 'premium',
    },
    {
        icon: Film,
        title: 'Movie Suggestions',
        desc: 'Discover films for movie night events with ratings and details.',
        tier: 'premium',
    },
    {
        icon: MapPin,
        title: 'Venue Search',
        desc: 'Find and verify locations with address lookup and mapping.',
        tier: 'free',
    },
    {
        icon: Calendar,
        title: 'Holiday Alerts',
        desc: 'Spot holiday conflicts and plan around school breaks.',
        tier: 'free',
    },
    {
        icon: Download,
        title: 'Smart Export',
        desc: 'Export to Google Calendar, Outlook, or copy event details.',
        tier: 'free',
    },
];

export function LandingPage({ onNavigate }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-[#FAF8F5]">
            <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">

                <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight mb-4">
                    Plan events enriched with live insights
                </h1>

                <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
                    Create events and get weather forecasts, league schedules, movie suggestions, and holiday alerts — all
                    in one place.
                </p>

                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => onNavigate('register')}
                        className="flex items-center gap-2 bg-linear-to-r from-orange-400 to-red-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
                    >
                        <Sparkles className="w-4 h-4" />
                        Get Started Free
                    </button>
                    <button
                        onClick={() => onNavigate('login')}
                        className="font-semibold text-gray-700 bg-white border border-gray-200 px-6 py-3 rounded-xl hover:border-gray-300 transition-colors"
                    >
                        Log In
                    </button>
                </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-orange-200 hover:shadow-md transition-all group"
                        >
                            <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-100 transition-colors">
                                <f.icon className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900">{f.title}</h3>
                                {f.tier === 'premium' && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                        <Crown className="w-2.5 h-2.5" />
                                        PRO
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
                <div className="bg-linear-to-r from-orange-400 to-red-500 rounded-3xl p-10 text-center text-white">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Crown className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Upgrade to Premium</h2>
                    <p className="text-orange-100 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                        Unlock league scores, movie suggestions, and richer event insights.
                    </p>
                    <button
                        onClick={() => onNavigate('register')}
                        className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-2.5 rounded-xl hover:bg-orange-50 transition-colors"
                    >
                        Start Free Today, Upgrade Anytime
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </section>
        </div>
    );
}
