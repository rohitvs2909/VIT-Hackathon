import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Room3DView from './Room3DView';

export default function View3DModal({ open, onClose, image }) {
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    if (!open) return;
    setIsPreparing(true);
    const timer = setTimeout(() => setIsPreparing(false), 900);
    return () => clearTimeout(timer);
  }, [open, image]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            transition={{ duration: 0.22 }}
            className="relative h-[92vh] w-full max-w-7xl rounded-2xl border border-white/20 bg-black/95 p-3 md:p-4 shadow-[0_24px_70px_rgba(30,41,59,0.5)]"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
            >
              Close
            </button>

            <div className="mb-3 px-1 text-white">
              <h3 className="text-lg font-semibold">Interactive 3D Room View</h3>
              <p className="text-sm text-slate-300">Drag to rotate, scroll to zoom, explore your AI-designed room.</p>
            </div>

            <div className="relative h-[calc(100%-3.2rem)] w-full">
              <Room3DView image={image} />

              <AnimatePresence>
                {isPreparing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/65"
                  >
                    <p className="text-sm font-medium tracking-wide text-white">Preparing 3D view...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
