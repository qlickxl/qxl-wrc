'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/utils/animations';

export const TableSkeleton = () => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden"
    >
      <div className="p-6 space-y-3">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            variants={staggerItem}
            className="loading-shimmer h-16 rounded-lg"
          />
        ))}
      </div>
    </motion.div>
  );
};

export const CardSkeleton = () => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
    >
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="loading-shimmer h-48 rounded-lg"
        />
      ))}
    </motion.div>
  );
};

export const RallySpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 border-4 border-white/20 border-t-wrc-blue rounded-full"
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white text-xl mt-4"
      >
        Loading...
      </motion.p>
    </div>
  );
};

export const StandingsCardSkeleton = () => {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          variants={staggerItem}
          className="loading-shimmer h-20 rounded-lg border border-white/10"
        />
      ))}
    </motion.div>
  );
};
