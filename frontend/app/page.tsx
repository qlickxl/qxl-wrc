'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, slideUpVariants, cardVariants } from '@/utils/animations';
import { RallySpinner } from '@/components/LoadingSkeleton';
import Standings from '@/components/Standings';
import RallyResults from '@/components/RallyResults';
import AnimatedFlag from '@/components/AnimatedFlag';

interface Rally {
  id: number;
  season: number;
  round: number;
  name: string;
  official_name: string;
  country: string;
  surface: string;
  start_date: string;
  end_date: string;
  total_stages: number;
  status: string;
  event_id: number;
}

function getSurfaceEmoji(surface: string | null): string {
  if (!surface) return '';
  const s = surface.toLowerCase();
  if (s.includes('gravel') || s.includes('dirt')) return '🪨';
  if (s.includes('tarmac') || s.includes('asphalt')) return '🛣️';
  if (s.includes('snow') || s.includes('ice')) return '❄️';
  if (s.includes('mixed')) return '🔄';
  return '';
}

export default function Home() {
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [loading, setLoading] = useState(true);
  const [standingsOpen, setStandingsOpen] = useState(false);
  const [selectedRally, setSelectedRally] = useState<Rally | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, label: '' });

  // Fetch rally calendar
  useEffect(() => {
    const fetchRallies = async () => {
      try {
        const res = await fetch('/api/wrc/rallies');
        if (res.ok) {
          const data = await res.json();
          setRallies(data);
        }
      } catch (err) {
        console.error('Failed to fetch rallies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRallies();
  }, []);

  // Countdown to next rally
  useEffect(() => {
    const getNextRally = () => {
      const now = new Date();
      return rallies.find((r) => r.start_date && new Date(r.start_date) > now);
    };

    const updateCountdown = () => {
      const next = getNextRally();
      if (!next || !next.start_date) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, label: 'Season Complete' });
        return;
      }

      const now = new Date().getTime();
      const target = new Date(next.start_date).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, label: `${next.name} is underway!` });
        return;
      }

      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        label: next.name,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [rallies]);

  // Sticky nav on scroll
  useEffect(() => {
    const handleScroll = () => setShowNav(window.scrollY > 120);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // IntersectionObserver for active section
  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.getAttribute('data-section') || '');
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px' }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading]);

  const handleRallyClick = (rally: Rally) => {
    setSelectedRally(rally);
    setResultsOpen(true);
  };

  const upcomingRallies = rallies.filter((r) => r.status === 'upcoming' || (r.start_date && new Date(r.start_date) > new Date()));
  const completedRallies = rallies.filter((r) => r.status === 'completed' || (r.start_date && new Date(r.start_date) <= new Date()));

  return (
    <div className="relative min-h-screen">
      {/* Sticky Navigation */}
      <AnimatePresence>
        {showNav && (
          <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-40 bg-wrc-dark/90 backdrop-blur-lg border-b border-white/10"
          >
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <img src="/wrc-car-logo.svg" alt="" className="h-7 w-auto" />
                <span className="text-white font-bold text-lg">WRC Rally</span>
              </div>
              <div className="flex gap-1">
                {['calendar', 'upcoming', 'results'].map((section) => (
                  <a
                    key={section}
                    href={`#${section}`}
                    className={`px-4 py-1.5 rounded-full text-sm capitalize transition-all ${
                      activeSection === section
                        ? 'bg-wrc-blue text-white font-semibold shadow-lg shadow-wrc-blue/30'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {section}
                  </a>
                ))}
                <button
                  onClick={() => setStandingsOpen(true)}
                  className={`px-4 py-1.5 rounded-full text-sm transition-all ${
                    standingsOpen
                      ? 'bg-wrc-blue text-white font-semibold shadow-lg shadow-wrc-blue/30'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Standings
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative pt-12 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center gap-4 mb-2">
              <img src="/wrc-car-logo.svg" alt="WRC Rally Car" className="h-16 md:h-20 w-auto" />
              <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">
                AWagi <span className="text-wrc-blue">WRC</span>
              </h1>
            </div>
            <div className="w-24 h-1 bg-wrc-blue mx-auto rounded-full" />
            <p className="text-white/50 text-lg mt-3">World Rally Championship Analytics</p>
          </motion.div>

          {/* Countdown */}
          {countdown.label && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-8 inline-block"
            >
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
                <p className="text-white/50 text-sm mb-3 uppercase tracking-wider">Next Rally</p>
                <p className="text-white font-semibold text-xl mb-4">{countdown.label}</p>
                {(countdown.days > 0 || countdown.hours > 0) && (
                  <div className="flex items-start justify-center" suppressHydrationWarning>
                    {[
                      { value: countdown.days, label: 'Days' },
                      { value: countdown.hours, label: 'Hrs' },
                      { value: countdown.minutes, label: 'Min' },
                      { value: countdown.seconds, label: 'Sec' },
                    ].map((item, i) => (
                      <div key={item.label} className="flex items-start">
                        {i > 0 && <span className="text-wrc-red text-3xl font-bold mx-1 -mt-0.5">:</span>}
                        <div className="text-center">
                          <div className="text-3xl font-bold text-wrc-blue font-mono" suppressHydrationWarning>
                            {String(item.value).padStart(2, '0')}
                          </div>
                          <div className="text-white/40 text-xs uppercase">{item.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8 flex gap-3 justify-center flex-wrap"
          >
            <button
              onClick={() => setStandingsOpen(true)}
              className="btn-wrc px-6 py-3 bg-wrc-blue text-white rounded-xl font-semibold"
            >
              Championship Standings
            </button>
            <a
              href="#calendar"
              className="btn-wrc px-6 py-3 bg-white/10 text-white rounded-xl font-semibold border border-white/20"
            >
              Rally Calendar
            </a>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 pb-20">
        {loading ? (
          <RallySpinner />
        ) : (
          <>
            {/* Full Calendar Section */}
            <section id="calendar" data-section="calendar" className="scroll-mt-20 mb-16">
              <motion.div
                variants={slideUpVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="bg-wrc-blue rounded-xl px-6 py-4 mb-6"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white">
                  {rallies.length > 0 ? rallies[0].season : new Date().getFullYear()} Rally Calendar
                </h2>
                <p className="text-white/70 text-sm mt-1">
                  {completedRallies.length} completed &middot; {upcomingRallies.length} upcoming
                </p>
              </motion.div>

              {rallies.length === 0 ? (
                <p className="text-white/50 text-center py-12">No calendar data available. Sync the WRC API to populate.</p>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {rallies.map((rally) => {
                    const isPast = rally.start_date && new Date(rally.start_date) <= new Date();
                    return (
                      <motion.div
                        key={rally.id}
                        variants={staggerItem}
                        onClick={() => handleRallyClick(rally)}
                        className={`card-wrc cursor-pointer p-5 rounded-xl border transition-all ${
                          isPast
                            ? 'bg-white/5 border-white/10 hover:border-wrc-blue/50'
                            : 'bg-wrc-blue/10 border-wrc-blue/30 hover:border-wrc-blue'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-white/40 text-sm font-mono">R{rally.round}</span>
                          <AnimatedFlag country={rally.country} size={36} />
                        </div>
                        <h3 className="text-white font-bold text-lg">{rally.name}</h3>
                        <p className="text-white/50 text-sm mt-1">{rally.country}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
                          {rally.start_date && (
                            <span>{new Date(rally.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          )}
                          {rally.surface && (
                            <span>{getSurfaceEmoji(rally.surface)} {rally.surface}</span>
                          )}
                          {rally.total_stages && (
                            <span>{rally.total_stages} stages</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isPast
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-wrc-blue/20 text-wrc-blue'
                          }`}>
                            {isPast ? 'Completed' : 'Upcoming'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </section>

            {/* Upcoming Rallies */}
            {upcomingRallies.length > 0 && (
              <section id="upcoming" data-section="upcoming" className="scroll-mt-20 mb-16">
                <motion.div
                  variants={slideUpVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-wrc-blue/80 rounded-xl px-6 py-3 mb-6"
                >
                  <h2 className="text-2xl font-bold text-white">Upcoming Rallies</h2>
                </motion.div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="space-y-3"
                >
                  {upcomingRallies.slice(0, 5).map((rally) => (
                    <motion.div
                      key={rally.id}
                      variants={staggerItem}
                      onClick={() => handleRallyClick(rally)}
                      className="table-row-interactive flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <AnimatedFlag country={rally.country} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold">{rally.name}</div>
                        <div className="text-white/40 text-sm">
                          Round {rally.round} • {rally.country}
                          {rally.surface && ` • ${rally.surface}`}
                        </div>
                      </div>
                      <div className="text-right text-white/50 text-sm" suppressHydrationWarning>
                        {rally.start_date && new Date(rally.start_date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {/* Recent Results */}
            {completedRallies.length > 0 && (
              <section id="results" data-section="results" className="scroll-mt-20 mb-16">
                <motion.div
                  variants={slideUpVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="bg-wrc-blue/80 rounded-xl px-6 py-3 mb-6"
                >
                  <h2 className="text-2xl font-bold text-white">Recent Results</h2>
                </motion.div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  className="space-y-3"
                >
                  {completedRallies.slice(-5).reverse().map((rally) => (
                    <motion.div
                      key={rally.id}
                      variants={staggerItem}
                      onClick={() => handleRallyClick(rally)}
                      className="table-row-interactive flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <AnimatedFlag country={rally.country} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold">{rally.name}</div>
                        <div className="text-white/40 text-sm">
                          Round {rally.round} • {rally.country}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                          View Results
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center text-white/30 text-sm">
          <p className="font-semibold text-white/50 mb-1">AWagi WRC</p>
          <p>&copy; {new Date().getFullYear()} AWagi WRC Rally Analytics &bull; Data from eWRC</p>
        </div>
      </footer>

      {/* Modals */}
      <Standings isOpen={standingsOpen} onClose={() => setStandingsOpen(false)} />
      <RallyResults rally={selectedRally} isOpen={resultsOpen} onClose={() => setResultsOpen(false)} />
    </div>
  );
}
