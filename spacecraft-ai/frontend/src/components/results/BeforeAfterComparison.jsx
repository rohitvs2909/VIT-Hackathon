import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Upload } from 'lucide-react';

/**
 * BeforeAfterComparison Component
 * Premium draggable overlay slider for comparing original and AI-generated room designs
 * - AFTER image = base (full width, always visible on right)
 * - BEFORE image = overlay (controlled width, visible on left)
 * - Slider controls overlay width via absolute positioning
 */
function BeforeAfterComparison({ beforeImage, afterImage }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState('slider');
  const containerRef = useRef(null);

  // Handle drag start
  const startDragging = () => {
    setIsDragging(true);
  };

  // Handle drag movement
  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;

    // Clamp position between 0 and 100
    setSliderPosition(Math.max(0, Math.min(100, position)));
  };

  // Handle drag end
  const stopDragging = () => {
    setIsDragging(false);
  };

  // Condition: Missing images
  if (!beforeImage || !afterImage) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-soft p-8 mb-12"
      >
        <h2 className="text-3xl font-bold mb-6">Before & After Comparison</h2>

        <div className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
          <div className="text-center">
            {!beforeImage && (
              <div className="mb-6">
                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-3" />
                <p className="text-lg font-semibold text-slate-600">Upload an image to start</p>
              </div>
            )}

            {beforeImage && !afterImage && (
              <div className="mb-6">
                <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-3 animate-pulse" />
                <p className="text-lg font-semibold text-slate-600">Generating AI design...</p>
                <p className="text-sm text-slate-500 mt-2">Your comparison will appear here</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 mt-4 text-sm">
          {!beforeImage
            ? 'Upload a room image to begin the design wizard'
            : 'Processing your AI room redesign...'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card-soft p-8 mb-12"
    >
      <h2 className="text-3xl font-bold mb-2">Before & After Comparison</h2>
      <p className="text-slate-600 mb-4 text-sm">Switch views or drag the slider to compare your original room with the AI-generated design</p>

      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setViewMode('before')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            viewMode === 'before'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
          }`}
        >
          Before Image
        </button>
        <button
          type="button"
          onClick={() => setViewMode('after')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            viewMode === 'after'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
          }`}
        >
          After Image
        </button>
        <button
          type="button"
          onClick={() => setViewMode('slider')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
            viewMode === 'slider'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
          }`}
        >
          Compare
        </button>
      </div>

      {/* Main Container - Overlay Slider */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
        style={{ cursor: isDragging ? 'col-resize' : 'col-resize' }}
      >
        {viewMode === 'before' && (
          <>
            <img
              src={beforeImage}
              alt="Before - Original Room"
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
            />

            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold text-sm border border-white/20 z-10">
              Before Image
            </div>
          </>
        )}

        {viewMode === 'after' && (
          <>
            <img
              src={afterImage}
              alt="After - AI Generated Design"
              className="absolute inset-0 w-full h-full object-cover"
              draggable="false"
            />

            <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold text-sm border border-white/20 z-10">
              AI Generated Image
            </div>
          </>
        )}

        {viewMode === 'slider' && (
          <>
        {/* AFTER IMAGE - Base Layer (Full Width) */}
        <img
          src={afterImage}
          alt="After - AI Generated Design"
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />

        {/* BEFORE IMAGE - Overlay (Clipped Left Side) */}
        <div
          className="absolute inset-0 overflow-hidden transition-all duration-200"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeImage}
            alt="Before - Original Room"
            className="w-full h-full object-cover"
            draggable="false"
          />
        </div>

        {/* SLIDER LINE - Vertical Divider */}
        <div
          className="absolute top-0 h-full w-[3px] bg-white z-20 transition-all duration-200"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        />

        {/* DRAG HANDLE - Circle Indicator */}
        <motion.div
          className="absolute top-1/2 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing border-4 border-slate-800 z-30"
          style={{
            left: `${sliderPosition}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={startDragging}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19l7-7-7-7" />
          </svg>
        </motion.div>

        {/* BEFORE LABEL - Top Left */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-6 left-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold text-sm border border-white/20 z-10"
        >
          📸 Before
        </motion.div>

        {/* AFTER LABEL - Top Right */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute top-6 right-6 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold text-sm border border-white/20 z-10"
        >
          ✨ After
        </motion.div>

        {/* AI Inspired Label */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 text-slate-800 px-4 py-2 rounded-full font-semibold text-xs border border-slate-200 z-10"
        >
          AI Inspired Redesign
        </motion.div>

        {/* Position Indicator - Bottom Center */}
        <motion.div
          animate={{ opacity: isDragging ? 1 : 0.7 }}
          className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold border border-white/20 z-10"
        >
          {Math.round(sliderPosition)}%
        </motion.div>
          </>
        )}
      </div>

      {/* Helper Text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-slate-500 mt-4 text-sm"
      >
        {viewMode === 'slider'
          ? (isDragging ? '🎯 Dragging...' : '👆 Grab the slider to compare')
          : 'Click Compare to return to before/after slider mode'}
      </motion.p>
    </motion.div>
  );
}

export default BeforeAfterComparison;
