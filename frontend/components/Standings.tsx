'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, modalVariants, backdropVariants } from '@/utils/animations';
import { StandingsCardSkeleton } from './LoadingSkeleton';
import ManufacturerLogo from './ManufacturerLogo';

interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  podiums: number;
  stage_wins: number;
  manufacturer: string;
  driver_name: string;
  nationality: string;
  photo_url: string | null;
}

interface ManufacturerStanding {
  position: number;
  points: number;
  wins: number;
  manufacturer_name: string;
  nationality: string;
  logo_url: string | null;
}

const COUNTRY_TO_CODE: Record<string, string> = {
  'Monaco': 'MC', 'Sweden': 'SE', 'Kenya': 'KE', 'Croatia': 'HR',
  'Portugal': 'PT', 'Italy': 'IT', 'Greece': 'GR', 'Estonia': 'EE',
  'Finland': 'FI', 'Chile': 'CL', 'Japan': 'JP', 'Spain': 'ES',
  'Mexico': 'MX', 'Poland': 'PL', 'Latvia': 'LV', 'Germany': 'DE',
  'Turkey': 'TR', 'France': 'FR', 'Belgium': 'BE', 'Great Britain': 'GB',
  'United Kingdom': 'GB', 'New Zealand': 'NZ', 'Australia': 'AU',
  'Argentina': 'AR', 'Ireland': 'IE', 'Czech Republic': 'CZ',
  'Norway': 'NO', 'Austria': 'AT', 'Netherlands': 'NL',
  'South Korea': 'KR', 'Bulgaria': 'BG', 'Slovenia': 'SI',
  'Welsh': 'GB', 'British': 'GB', 'Finnish': 'FI', 'French': 'FR',
  'Belgian': 'BE', 'Estonian': 'EE', 'Irish': 'IE', 'Japanese': 'JP',
  'Spanish': 'ES', 'German': 'DE', 'Italian': 'IT', 'Norwegian': 'NO',
  'Swedish': 'SE', 'Polish': 'PL', 'Czech': 'CZ', 'Austrian': 'AT',
  'Latvian': 'LV', 'Mexican': 'MX', 'Chilean': 'CL',
  'New Zealander': 'NZ', 'Australian': 'AU', 'Argentine': 'AR',
  'South African': 'ZA', 'Slovenian': 'SI', 'Croatian': 'HR',
  'Greek': 'GR', 'Monegasque': 'MC', 'Portuguese': 'PT', 'Dutch': 'NL',
  'Turkish': 'TR', 'Korean': 'KR', 'Bulgarian': 'BG', 'Kenyan': 'KE',
};

function getFlag(nationality: string): string {
  const code = COUNTRY_TO_CODE[nationality];
  if (!code) return '🏁';
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

interface StandingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Standings({ isOpen, onClose }: StandingsProps) {
  const [tab, setTab] = useState<'drivers' | 'manufacturers'>('drivers');
  const [driverStandings, setDriverStandings] = useState<DriverStanding[]>([]);
  const [manufacturerStandings, setManufacturerStandings] = useState<ManufacturerStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const fetchStandings = async () => {
      try {
        const [driversRes, mfgRes] = await Promise.all([
          fetch('/api/wrc/standings/drivers'),
          fetch('/api/wrc/standings/manufacturers'),
        ]);
        if (driversRes.ok) {
          const data = await driversRes.json();
          setDriverStandings(data);
        }
        if (mfgRes.ok) {
          const data = await mfgRes.json();
          setManufacturerStandings(data);
        }
      } catch (err) {
        console.error('Failed to fetch standings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-wrc-dark/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Championship Standings</h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setTab('drivers')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  tab === 'drivers'
                    ? 'bg-wrc-blue text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                Drivers
              </button>
              <button
                onClick={() => setTab('manufacturers')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  tab === 'manufacturers'
                    ? 'bg-wrc-blue text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                Manufacturers
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
            {loading ? (
              <StandingsCardSkeleton />
            ) : tab === 'drivers' ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {driverStandings.length === 0 ? (
                  <p className="text-white/50 text-center py-8">No driver standings data available yet.</p>
                ) : (
                  driverStandings.map((d) => (
                    <motion.div
                      key={d.position}
                      variants={staggerItem}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className={`text-2xl font-bold w-10 text-center ${
                        d.position === 1 ? 'text-yellow-400' :
                        d.position === 2 ? 'text-gray-300' :
                        d.position === 3 ? 'text-amber-600' : 'text-white/50'
                      }`}>
                        {d.position}
                      </div>
                      <div className="text-xl">{getFlag(d.nationality)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{d.driver_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <ManufacturerLogo name={d.manufacturer} size={18} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-wrc-blue font-bold text-lg">{d.points}</div>
                        <div className="text-white/40 text-xs">
                          {d.wins > 0 && `${d.wins}W `}
                          {d.podiums > 0 && `${d.podiums}P`}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                {manufacturerStandings.length === 0 ? (
                  <p className="text-white/50 text-center py-8">No manufacturer standings data available yet.</p>
                ) : (
                  manufacturerStandings.map((m) => (
                    <motion.div
                      key={m.position}
                      variants={staggerItem}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className={`text-2xl font-bold w-10 text-center ${
                        m.position === 1 ? 'text-yellow-400' :
                        m.position === 2 ? 'text-gray-300' :
                        m.position === 3 ? 'text-amber-600' : 'text-white/50'
                      }`}>
                        {m.position}
                      </div>
                      <div className="text-xl">{getFlag(m.nationality)}</div>
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <ManufacturerLogo name={m.manufacturer_name} size={32} />
                        <div className="text-white font-semibold truncate">{m.manufacturer_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-wrc-blue font-bold text-lg">{m.points}</div>
                        <div className="text-white/40 text-xs">
                          {m.wins > 0 && `${m.wins} wins`}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
