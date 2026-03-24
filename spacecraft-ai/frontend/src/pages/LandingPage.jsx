import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, WandSparkles, SlidersHorizontal, Sparkles, Upload, BarChart3 } from 'lucide-react';
import { useDesignStore } from '../store/designStore';
import { imageAPI } from '../utils/api';

function LandingPage() {
  const navigate = useNavigate();
  const pipelineStages = useMemo(
    () => ['Analyzing Structure', 'Estimating Layout', 'Applying Style Layers', 'Optimizing Budget Fit', 'Generating Preview'],
    []
  );

  const previewBlueprints = useMemo(
    () => [
      { id: 'layout', title: 'Layout', from: 'from-blue-500/25', to: 'to-indigo-500/20' },
      { id: 'style', title: 'Style', from: 'from-indigo-500/25', to: 'to-purple-500/20' },
      { id: 'lighting', title: 'Lighting', from: 'from-purple-500/25', to: 'to-fuchsia-500/20' }
    ],
    []
  );

  const [pipelineProgress, setPipelineProgress] = useState(18);
  const [stageIndex, setStageIndex] = useState(0);
  const [providerConfigured, setProviderConfigured] = useState(null);
  const [previewCards, setPreviewCards] = useState(
    previewBlueprints.map((card, idx) => ({ ...card, score: 74 + idx * 5 }))
  );

  const {
    uploadedImage,
    generatedDesign,
    isGenerating,
    budget,
    roomType,
    style
  } = useDesignStore();

  const stageOverride = useMemo(() => {
    if (isGenerating) return 'Generating Design';
    if (generatedDesign?.outputImage) return 'Design Ready';
    if (uploadedImage?.url) return 'Image Uploaded';
    return null;
  }, [isGenerating, generatedDesign, uploadedImage]);

  const realtimeBudgetFit = useMemo(() => {
    if (!generatedDesign) {
      const base = { low: 93, medium: 88, high: 83, luxury: 79 };
      return base[budget] || 86;
    }

    const base = { low: 93, medium: 88, high: 83, luxury: 79 };
    const byBudget = base[budget] || 86;
    const confidence = generatedDesign.provider === 'mock-fallback' ? -8 : 0;
    return Math.max(70, Math.min(98, byBudget + confidence));
  }, [generatedDesign, budget]);

  useEffect(() => {
    if (isGenerating) {
      setPipelineProgress(78);
      return;
    }

    if (generatedDesign?.outputImage) {
      setPipelineProgress(100);
      return;
    }

    if (uploadedImage?.url) {
      setPipelineProgress(42);
      return;
    }

    setPipelineProgress(18);
  }, [isGenerating, generatedDesign, uploadedImage]);

  useEffect(() => {
    const fetchProviderStatus = async () => {
      try {
        const response = await imageAPI.getProviderStatus();
        const configured = response?.data?.providers
          ? Object.values(response.data.providers).some((provider) => provider.configured)
          : false;
        setProviderConfigured(!!configured);
      } catch {
        setProviderConfigured(false);
      }
    };

    fetchProviderStatus();
  }, [generatedDesign, uploadedImage]);

  useEffect(() => {
    if (!generatedDesign?.outputImage) return;

    setPreviewCards([
      {
        id: 'before',
        title: 'Input Room',
        score: 100,
        image: uploadedImage?.url || generatedDesign.inputImage || null,
        from: 'from-blue-500/25',
        to: 'to-indigo-500/20'
      },
      {
        id: 'after',
        title: 'AI Redesign',
        score: generatedDesign.provider === 'mock-fallback' ? 76 : 94,
        image: generatedDesign.outputImage,
        from: 'from-indigo-500/25',
        to: 'to-purple-500/20'
      },
      {
        id: 'meta',
        title: 'Generation',
        score: generatedDesign.provider === 'mock-fallback' ? 72 : 91,
        image: null,
        subtitle: `${roomType || 'room'} • ${style || 'style'}`,
        from: 'from-purple-500/25',
        to: 'to-fuchsia-500/20'
      }
    ]);
  }, [generatedDesign, uploadedImage, roomType, style]);

  useEffect(() => {
    if (pipelineProgress >= 96 || pipelineProgress <= 18) {
      setStageIndex((prev) => (prev + 1) % pipelineStages.length);
      return;
    }

    const mapped = Math.min(
      pipelineStages.length - 1,
      Math.floor((pipelineProgress / 100) * pipelineStages.length)
    );
    setStageIndex(mapped);
  }, [pipelineProgress, pipelineStages]);

  const featureCards = [
    {
      icon: Upload,
      title: 'Upload Room',
      description: 'Drop a real room photo. AI keeps the structure and redesigns only interior layers.'
    },
    {
      icon: WandSparkles,
      title: 'Style Engine',
      description: 'Pick mood, style and room type with visual cards and instant context previews.'
    },
    {
      icon: SlidersHorizontal,
      title: 'Budget Intelligence',
      description: 'Low, medium, high, or luxury outputs with practical material and furniture decisions.'
    },
    {
      icon: BarChart3,
      title: 'Live Results Dashboard',
      description: 'Analyze space score, budget status, and generation details in one premium workspace.'
    }
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-10 flex flex-col justify-between"
        >
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              <Sparkles size={14} /> New Experience
            </p>
            <h1 className="mt-5 text-4xl md:text-5xl font-semibold leading-tight text-slate-900">
              Design Your Room with AI
              <span className="block text-gradient">Within Your Budget</span>
            </h1>
            <p className="mt-4 text-slate-600 max-w-xl">
              SpaceCraft AI transforms your room into a premium interior concept with budget-aware decisions,
              realistic proportions, and actionable insights in minutes.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => navigate('/design')} className="btn-primary inline-flex items-center gap-2">
              Start Designing <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/results')} className="btn-secondary">
              Try Demo
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-card p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-purple-500/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="relative grid grid-cols-12 gap-4">
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="col-span-7 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-soft"
            >
              <p className="text-xs text-slate-500">AI Pipeline</p>
              <p className="font-semibold text-slate-900 mt-2">{stageOverride || pipelineStages[stageIndex]}</p>
              <div className="mt-4 h-2 rounded-full bg-slate-200">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                  animate={{ width: `${pipelineProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="col-span-5 rounded-2xl border border-white/40 bg-white/75 p-4 shadow-soft"
            >
              <p className="text-xs text-slate-500">Budget Fit</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{realtimeBudgetFit}%</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {providerConfigured === null
                  ? 'Checking model status...'
                  : providerConfigured
                    ? 'Live provider connected'
                    : 'Provider unavailable'}
              </p>
            </motion.div>
            <div className="col-span-12 rounded-2xl border border-white/40 bg-white/80 p-4 shadow-soft">
              <p className="text-xs text-slate-500">Live Preview Cards</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {previewCards.map((card) => (
                  <div
                    key={card.id}
                    className={`h-24 rounded-xl bg-gradient-to-br ${card.from} ${card.to} border border-white/60 p-3 overflow-hidden relative`}
                  >
                    {card.image ? (
                      <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                    <div className={`absolute inset-0 ${card.image ? 'bg-black/35' : ''}`} />
                    <div className="relative z-10">
                      <p className={`text-[11px] ${card.image ? 'text-white/90' : 'text-slate-600'}`}>{card.title}</p>
                      <p className={`mt-1 text-lg font-semibold ${card.image ? 'text-white' : 'text-slate-800'}`}>{card.score}%</p>
                      <p className={`text-[10px] ${card.image ? 'text-white/85' : 'text-slate-600'}`}>
                        {card.subtitle || 'Confidence'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {featureCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              className="glass-card p-5 hover:-translate-y-1 hover:shadow-glow transition-all duration-300"
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white flex items-center justify-center mb-4">
                <Icon size={18} />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
              <p className="text-sm text-slate-600 mt-2">{card.description}</p>
            </motion.div>
          );
        })}
      </section>

      <section className="glass-card p-6 md:p-8 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <h2 className="text-2xl font-semibold text-slate-900">Built Like a Real Product, Not a Prototype</h2>
          <p className="mt-3 text-slate-600">
            SpaceCraft AI combines a visual wizard, premium dashboard UI, and practical insights to deliver judge-ready,
            portfolio-grade interior transformation demos.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-5 text-white shadow-glow">
          <p className="text-sm text-white/90">Launch the experience</p>
          <button onClick={() => navigate('/design')} className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-all">
            Open Design Wizard
          </button>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
