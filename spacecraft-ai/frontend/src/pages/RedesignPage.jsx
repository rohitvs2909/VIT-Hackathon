import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BrainCircuit, Sparkles, WandSparkles } from 'lucide-react';
import { useDesignStore } from '../store/designStore';
import { imageAPI } from '../utils/api';

// Import wizard steps
import StepIndicator from '../components/design/StepIndicator';
import ImageUploadStep from '../components/design/ImageUploadStep';
import RoomTypeSelectionStep from '../components/design/RoomTypeSelectionStep';
import EnhancedStyleSelectionStep from '../components/design/EnhancedStyleSelectionStep';
import MoodSelectionStep from '../components/design/MoodSelectionStep';
import BudgetPriorityStep from '../components/design/BudgetPriorityStep';
import FinalReviewStep from '../components/design/FinalReviewStep';

/**
 * RedesignPage - NEW IMAGE-BASED DESIGN WIZARD
 * 7-step wizard for AI room redesign
 */
export default function RedesignPage() {
  const navigate = useNavigate();
  const {
    step,
    setStep,
    uploadedImage,
    setUploadedImage,
    imageId,
    roomType,
    setRoomType,
    style,
    setStyle,
    mood,
    setMood,
    budget,
    setBudget,
    priority,
    setPriority,
    isStudentMode,
    setStudentMode,
    isGenerating,
    setIsGenerating,
    generatedDesign,
    setGeneratedDesign,
    reset
  } = useDesignStore();

  const [localLoading, setLocalLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [cloudinaryGeneratedImage, setCloudinaryGeneratedImage] = useState(null);
  const [cloudinaryLoading, setCloudinaryLoading] = useState(false);

  const loadingSteps = [
    'Analyzing your room...',
    'Optimizing layout...',
    'Matching style and budget...',
    'Rendering redesigned preview...'
  ];

  const steps = [
    { number: 1, title: 'Upload Room', icon: '📸' },
    { number: 2, title: 'Room Type', icon: '🏠' },
    { number: 3, title: 'Style', icon: '🎨' },
    { number: 4, title: 'Mood', icon: '✨' },
    { number: 5, title: 'Budget', icon: '💰' },
    { number: 6, title: 'Review', icon: '✓' },
    { number: 7, title: 'Generate', icon: '⚙️' }
  ];

  // Handle image upload
  const handleImageUpload = (imageData) => {
    setUploadedImage({
      id: imageData.id,
      filename: imageData.filename,
      url: imageData.url,
      name: imageData.originalName,
      preview: imageData.url, // Backend will serve this at /api/uploads/{filename}
    });
  };

  // Handle generate design
  const handleGenerateDesign = async () => {
    if (!imageId || !roomType || !style) {
      toast.error('Missing required information');
      return;
    }

    try {
      setIsGenerating(true);
      setLocalLoading(true);
      setLoadingStepIndex(0);

      let intervalId = null;
      intervalId = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % loadingSteps.length);
      }, 900);

      const designData = {
        imageId,
        roomType,
        style,
        mood,
        budget,
        priority,
        isStudentMode,
        provider: 'pollinations'
      };

      const response = await imageAPI.generateDesign(designData);

      if (response.data.success) {
        if (intervalId) clearInterval(intervalId);
        setGeneratedDesign(response.data);
        toast.success('✨ Room redesign generated successfully!');
        
        // Navigate to results page after brief delay
        setTimeout(() => {
          navigate('/results');
        }, 1000);
      } else {
        if (intervalId) clearInterval(intervalId);
        throw new Error(response.data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate design');
    } finally {
      setIsGenerating(false);
      setLocalLoading(false);
    }
  };

  const handleGenerateFromCloudinary = async () => {
    try {
      setCloudinaryLoading(true);
      const response = await imageAPI.generateCloudinaryDesign();
      if (response.data?.success && response.data?.image) {
        setCloudinaryGeneratedImage(response.data.image);
        toast.success('Cloudinary image redesigned with Hugging Face');
      } else {
        throw new Error(response.data?.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Cloudinary generation error:', error);
      toast.error(error.message || 'Failed to generate from Cloudinary image');
    } finally {
      setCloudinaryLoading(false);
    }
  };

  // Reset wizard on mount
  useEffect(() => {
    return () => {
      // Don't reset, keep data for navigation back
    };
  }, []);

  return (
    <div className="relative">
      <AnimatePresence>
        {(isGenerating || localLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm p-4"
          >
            <div className="h-full w-full flex items-center justify-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-xl rounded-3xl border border-white/20 bg-white/90 p-8 shadow-soft"
              >
                <div className="flex items-center gap-3 text-indigo-700 mb-5">
                  <BrainCircuit />
                  <p className="font-semibold">AI Processing</p>
                </div>
                <h3 className="text-2xl font-semibold text-slate-900">{loadingSteps[loadingStepIndex]}</h3>
                <p className="text-sm text-slate-600 mt-2">We are redesigning your room based on your style, mood, and budget preferences.</p>

                <div className="mt-6 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                    animate={{ width: `${((loadingStepIndex + 1) / loadingSteps.length) * 100}%` }}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {loadingSteps.map((label, idx) => (
                    <div key={label} className={`rounded-xl border p-3 text-sm ${idx <= loadingStepIndex ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                      {label}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-semibold bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent mb-2">
            AI Room Redesign
          </h1>
          <p className="text-slate-600">
            Card-based wizard to redesign your room with startup-grade visual quality.
          </p>
        </motion.div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} totalSteps={steps.length} steps={steps} />

        {/* Content Container */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="mt-6 rounded-3xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-soft p-6 md:p-10"
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Upload Image */}
            {step === 1 && (
              <ImageUploadStep
                key="step1"
                onImageUpload={(imageData) => {
                  handleImageUpload(imageData);
                  setTimeout(() => setStep(2), 300);
                }}
                uploadedImage={uploadedImage}
                isLoading={localLoading}
              />
            )}

            {/* Step 2: Room Type Selection */}
            {step === 2 && (
              <RoomTypeSelectionStep
                key="step2"
                selectedRoom={roomType}
                onRoomSelect={setRoomType}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}

            {/* Step 3: Style Selection */}
            {step === 3 && (
              <EnhancedStyleSelectionStep
                key="step3"
                selectedStyle={style}
                onStyleSelect={setStyle}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}

            {/* Step 4: Mood Selection */}
            {step === 4 && (
              <MoodSelectionStep
                key="step4"
                selectedMood={mood}
                onMoodSelect={setMood}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
              />
            )}

            {/* Step 5: Budget & Priority */}
            {step === 5 && (
              <BudgetPriorityStep
                key="step5"
                budget={budget}
                priority={priority}
                onBudgetChange={setBudget}
                onPriorityChange={setPriority}
                onNext={() => setStep(6)}
                onBack={() => setStep(4)}
              />
            )}

            {/* Step 6: Final Review & Generation */}
            {step === 6 && (
              <FinalReviewStep
                key="step6"
                designData={{
                  roomType,
                  style,
                  mood,
                  budget,
                  priority,
                  isStudentMode
                }}
                uploadedImage={uploadedImage}
                isStudentMode={isStudentMode}
                onStudentModeToggle={() => setStudentMode(!isStudentMode)}
                onGenerate={handleGenerateDesign}
                onBack={() => setStep(5)}
                isGenerating={isGenerating || localLoading}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="mt-8 bg-slate-200 rounded-full h-2 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
            animate={{ width: `${(step / 6) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </motion.div>

        {/* Step Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4"
        >
          <p className="text-slate-600 text-sm">
            Step {step} of 6 • {steps[step - 1]?.title}
          </p>
        </motion.div>

        </div>

        <aside className="col-span-12 xl:col-span-4 space-y-4">
          <div className="rounded-3xl border border-white/40 bg-white/75 backdrop-blur-xl shadow-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Live Hugging Face Demo</p>
            <h3 className="text-lg font-semibold text-slate-900 mt-2">Generate From Cloudinary</h3>
            <p className="mt-2 text-sm text-slate-600">Run real image-to-image generation with your Cloudinary public room image.</p>

            <button
              type="button"
              onClick={handleGenerateFromCloudinary}
              disabled={cloudinaryLoading}
              className="mt-4 w-full rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {cloudinaryLoading ? 'Generating AI design...' : 'Generate Cloudinary Redesign'}
            </button>

            {cloudinaryGeneratedImage && (
              <img
                src={cloudinaryGeneratedImage}
                alt="Hugging Face generated room"
                className="mt-4 rounded-2xl shadow-xl w-full"
              />
            )}
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/75 backdrop-blur-xl shadow-soft p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500">Wizard Guidance</p>
            <h3 className="text-lg font-semibold text-slate-900 mt-2">Design Flow</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 text-indigo-500" /> Upload a clear room image for best structure detection.</li>
              <li className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 text-indigo-500" /> Choose style and mood through large visual cards.</li>
              <li className="flex items-start gap-2"><Sparkles size={14} className="mt-0.5 text-indigo-500" /> Use budget and priority to shape realistic outcomes.</li>
            </ul>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-5 text-white shadow-glow">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <WandSparkles size={16} /> Premium Output
            </div>
            <p className="mt-3 text-sm text-white/90">Your final result includes before/after comparison, budget feedback, and actionable AI insights.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
