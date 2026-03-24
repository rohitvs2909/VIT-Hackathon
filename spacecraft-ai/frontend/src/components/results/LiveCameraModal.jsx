import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LiveCamera from './LiveCamera';

export default function LiveCameraModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ duration: 0.22 }}
            className="relative h-[92vh] w-full max-w-6xl rounded-2xl bg-black p-3 md:p-4 border border-white/20 shadow-[0_24px_80px_rgba(16,185,129,0.25)]"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Close
            </button>

            <div className="mb-3 px-1 text-white">
              <h3 className="text-lg font-semibold">Live Camera AI Assistant</h3>
              <p className="text-sm text-slate-300">Scan your room and view realtime placement suggestions over the live feed.</p>
            </div>

            <div className="h-[calc(100%-3.2rem)] w-full">
              <LiveCamera />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
