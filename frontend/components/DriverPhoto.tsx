'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DRIVER_PHOTOS: Record<string, string> = {
  'Solberg': '/drivers/solberg.png',
  'Evans': '/drivers/evans.png',
  'Ogier': '/drivers/ogier.png',
  'Fourmaux': '/drivers/fourmaux.png',
  'Neuville': '/drivers/neuville.png',
  'Katsuta': '/drivers/katsuta.png',
  'Pajari': '/drivers/pajari.png',
  'Lappi': '/drivers/lappi.png',
  'Paddon': '/drivers/paddon.png',
  'Sordo': '/drivers/sordo.png',
  'Munster': '/drivers/munster.png',
  'Armstrong': '/drivers/armstrong.png',
  'Sesks': '/drivers/sesks.png',
  'Rossel': '/drivers/rossel.png',
  'Daprà': '/drivers/dapra.png',
  'Pelamourgues': '/drivers/pelamourgues.png',
  'Tänak': '/drivers/tanak.png',
  'Rovanperä': '/drivers/rovanpera.png',
  'Al-Attiyah': '/drivers/al-attiyah.png',
  'McErlean': '/drivers/mcerlean.png',
};

function getPhotoUrl(driverName: string): string | null {
  const surname = driverName.split(/[\s,.]+/)[0];
  return DRIVER_PHOTOS[surname] || null;
}

interface DriverPhotoProps {
  name: string;
  size?: number;
  className?: string;
}

export default function DriverPhoto({ name, size = 36, className = '' }: DriverPhotoProps) {
  const [enlarged, setEnlarged] = useState(false);
  const photo = getPhotoUrl(name);

  if (!photo) {
    const initials = name.split(/[\s.]+/).filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-white/10 text-white/50 text-xs font-bold shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    );
  }

  return (
    <>
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        onClick={(e) => { e.stopPropagation(); setEnlarged(true); }}
        className={`rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-wrc-blue transition-all ${className}`}
        style={{ width: size, height: size }}
      />
      <AnimatePresence>
        {enlarged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setEnlarged(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photo}
                alt={name}
                className="w-48 h-48 md:w-64 md:h-64 rounded-2xl object-cover shadow-2xl"
              />
              <div className="text-center mt-3">
                <p className="text-white font-semibold text-lg">{name}</p>
              </div>
              <button
                onClick={() => setEnlarged(false)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
