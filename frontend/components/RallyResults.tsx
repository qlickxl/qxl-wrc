'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, modalVariants, backdropVariants } from '@/utils/animations';
import { RallySpinner } from './LoadingSkeleton';

interface RallyResult {
  position: number | null;
  total_time: string | null;
  total_time_ms: number | null;
  gap_first: string | null;
  gap_first_ms: number | null;
  points: number;
  status: string;
  retirement_reason: string | null;
  driver_name: string;
  driver_nationality: string;
  codriver_name: string;
  car_number: number;
  car_class: string;
  team_name: string;
  manufacturer_name: string;
  manufacturer_logo: string | null;
}

interface Stage {
  id: number;
  stage_number: number;
  name: string;
  distance_km: number | null;
  is_power_stage: boolean;
  leg: number | null;
}

interface StageResult {
  stage_position: number;
  stage_time: string | null;
  overall_position: number;
  overall_time: string | null;
  gap_first: string | null;
  driver_name: string;
  car_number: number;
  manufacturer_name: string;
}

interface Rally {
  id: number;
  name: string;
  country: string;
  start_date: string;
  end_date: string;
  surface: string;
}

const COUNTRY_TO_CODE: Record<string, string> = {
  'Monaco': 'MC', 'Sweden': 'SE', 'Kenya': 'KE', 'Croatia': 'HR',
  'Portugal': 'PT', 'Italy': 'IT', 'Greece': 'GR', 'Estonia': 'EE',
  'Finland': 'FI', 'Chile': 'CL', 'Japan': 'JP', 'Spain': 'ES',
  'Mexico': 'MX', 'Poland': 'PL', 'Latvia': 'LV', 'Germany': 'DE',
  'Turkey': 'TR', 'France': 'FR', 'Belgium': 'BE', 'Great Britain': 'GB',
  'United Kingdom': 'GB', 'New Zealand': 'NZ', 'Australia': 'AU',
  'Argentina': 'AR', 'Ireland': 'IE', 'Norway': 'NO', 'Austria': 'AT',
  'Netherlands': 'NL', 'South Korea': 'KR', 'Czech Republic': 'CZ',
};

function getFlag(country: string): string {
  const code = COUNTRY_TO_CODE[country];
  if (!code) return '🏁';
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('');
}

interface RallyResultsProps {
  rally: Rally | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RallyResults({ rally, isOpen, onClose }: RallyResultsProps) {
  const [view, setView] = useState<'overall' | 'stages'>('overall');
  const [results, setResults] = useState<RallyResult[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !rally) return;
    setLoading(true);
    setView('overall');
    setSelectedStage(null);

    const fetchData = async () => {
      try {
        const [resultsRes, stagesRes] = await Promise.all([
          fetch(`/api/rallies/${rally.id}/results`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/wrc/rallies/${rally.id}/stages`),
        ]);
        if (resultsRes.ok) setResults(await resultsRes.json());
        if (stagesRes.ok) setStages(await stagesRes.json());
      } catch (err) {
        console.error('Failed to fetch rally data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, rally]);

  const handleStageSelect = async (stage: Stage) => {
    setSelectedStage(stage);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wrc/stages/${stage.id}/results`);
      if (res.ok) setStageResults(await res.json());
    } catch (err) {
      console.error('Failed to fetch stage results:', err);
    }
  };

  if (!isOpen || !rally) return null;

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
          className="relative bg-wrc-dark/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {getFlag(rally.country)} {rally.name}
                </h2>
                <p className="text-white/50 text-sm mt-1">
                  {rally.country} {rally.surface && `• ${rally.surface}`}
                  {rally.start_date && ` • ${new Date(rally.start_date).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setView('overall'); setSelectedStage(null); }}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'overall'
                    ? 'bg-wrc-blue text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setView('stages')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  view === 'stages'
                    ? 'bg-wrc-blue text-white'
                    : 'bg-white/10 text-white/60 hover:text-white'
                }`}
              >
                Stages ({stages.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
            {loading ? (
              <RallySpinner />
            ) : view === 'overall' ? (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
                {results.length === 0 ? (
                  <p className="text-white/50 text-center py-8">No results available yet.</p>
                ) : (
                  results.map((r, idx) => (
                    <motion.div
                      key={idx}
                      variants={staggerItem}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className={`text-xl font-bold w-10 text-center ${
                        r.position === 1 ? 'text-yellow-400' :
                        r.position === 2 ? 'text-gray-300' :
                        r.position === 3 ? 'text-amber-600' :
                        r.status === 'retired' ? 'text-red-400' : 'text-white/50'
                      }`}>
                        {r.status === 'retired' ? 'RET' : r.position || '-'}
                      </div>
                      <div className="text-sm text-white/40 w-8">#{r.car_number}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{r.driver_name}</div>
                        <div className="text-white/40 text-xs truncate">{r.codriver_name} • {r.manufacturer_name}</div>
                      </div>
                      <div className="text-right">
                        {r.total_time ? (
                          <>
                            <div className="text-white text-sm font-mono">{r.position === 1 ? r.total_time : r.gap_first ? `+${r.gap_first}` : r.total_time}</div>
                          </>
                        ) : r.retirement_reason ? (
                          <div className="text-red-400 text-xs">{r.retirement_reason}</div>
                        ) : null}
                        {r.points > 0 && (
                          <div className="text-wrc-blue text-xs font-medium">{r.points} pts</div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* Stage list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {stages.map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleStageSelect(stage)}
                      className={`p-3 rounded-lg text-left transition-all ${
                        selectedStage?.id === stage.id
                          ? 'bg-wrc-blue text-white border border-wrc-blue'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold text-sm">
                        SS{stage.stage_number}
                        {stage.is_power_stage && ' ⚡'}
                      </div>
                      <div className="text-xs opacity-60 truncate">{stage.name}</div>
                      {stage.distance_km && (
                        <div className="text-xs opacity-40">{stage.distance_km} km</div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Stage results */}
                {selectedStage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <h3 className="text-white font-semibold mb-3">
                      SS{selectedStage.stage_number}: {selectedStage.name}
                      {selectedStage.is_power_stage && ' ⚡ Power Stage'}
                    </h3>
                    <div className="space-y-1">
                      {stageResults.map((sr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 text-sm"
                        >
                          <div className={`font-bold w-8 text-center ${
                            sr.stage_position === 1 ? 'text-yellow-400' :
                            sr.stage_position === 2 ? 'text-gray-300' :
                            sr.stage_position === 3 ? 'text-amber-600' : 'text-white/50'
                          }`}>
                            {sr.stage_position}
                          </div>
                          <div className="text-white/40 w-8">#{sr.car_number}</div>
                          <div className="flex-1 text-white truncate">{sr.driver_name}</div>
                          <div className="text-white/50 text-xs">{sr.manufacturer_name}</div>
                          <div className="font-mono text-white text-right w-24">{sr.stage_time || '-'}</div>
                          <div className="font-mono text-white/40 text-right w-24">{sr.gap_first ? `+${sr.gap_first}` : '-'}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
