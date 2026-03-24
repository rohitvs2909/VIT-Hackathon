import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ImagePlus, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { imageAPI } from '../../utils/api';
import { useDesignStore } from '../../store/designStore';
import { buildDesignPrompt, fakeAnalysisSteps, parseUserIntent } from '../../utils/chatbotEngine';

const quickPrompts = [
  'Design my hostel room under Rs 8000',
  'Low budget setup for bedroom',
  'Modern gaming room under Rs 20000'
];

const transformationStrengthOptions = ['low', 'medium', 'high'];

function normalizeBackendImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
  const apiOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

function BotResultCard({ payload }) {
  if (!payload) return null;

  const budgetEntries = Object.entries(payload.budgetBreakdown || {});

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-soft">
      <p className="text-sm font-semibold text-slate-900">Design Summary</p>
      <p className="mt-1 text-sm text-slate-600">{payload.summary}</p>

      {payload.image && (
        <img
          src={payload.image}
          alt="Generated design preview"
          className="mt-3 w-full rounded-xl border border-slate-200 object-cover"
        />
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Budget Breakdown</p>
          <div className="mt-2 space-y-1">
            {budgetEntries.map(([key, amount]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize text-slate-600">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Furniture Suggestions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(payload.furniture || []).map((item) => (
              <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 border border-slate-200">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-3 border border-indigo-100">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-slate-700">Space Optimization Score</p>
          <p className="font-semibold text-indigo-700">{payload.score}/100</p>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-white/90">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
            style={{ width: `${payload.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ChatbotPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi, I am SpaceCraft AI Assistant. Ask me to redesign any room style with a budget and I will generate images in real time using the backend API.'
    }
  ]);
  const [typing, setTyping] = useState(false);
  const [typingStepIndex, setTypingStepIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [transformationStrength, setTransformationStrength] = useState('medium');

  const {
    uploadedImage,
    imageId,
    setGeneratedDesign,
    setUploadedImage,
    setRoomType,
    setStyle,
    setMood
  } = useDesignStore();

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const canSend = input.trim().length > 0 && !typing && !isUploading;

  const handleUploadClick = () => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  const handleChatImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);

      const response = await imageAPI.uploadImage(file);
      const payload = response.data?.image;

      if (!response.data?.success || !payload) {
        throw new Error(response.data?.error || 'Upload failed');
      }

      const normalizedUrl = normalizeBackendImageUrl(payload.url);

      const mappedImage = {
        id: payload.id,
        filename: payload.filename,
        url: normalizedUrl,
        name: payload.originalName,
        preview: normalizedUrl
      };

      setUploadedImage(mappedImage);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-upload-${Date.now()}`,
          role: 'bot',
          text: 'Room image uploaded successfully. Now send a design prompt and I will generate your AI inspired redesign in real time.'
        },
        {
          id: `bot-upload-preview-${Date.now()}`,
          role: 'bot',
          type: 'image',
          text: 'Uploaded Room Image',
          image: normalizedUrl
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-upload-error-${Date.now()}`,
          role: 'bot',
          text: 'Image upload failed. Please try another image.'
        }
      ]);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing, typingStepIndex]);

  const sendMessage = async (rawText) => {
    const text = String(rawText || input).trim();
    if (!text || typing) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setTyping(true);
    setTypingStepIndex(0);

    const stepsCount = fakeAnalysisSteps.length;
    let currentStep = 0;

    const stepTimer = setInterval(() => {
      currentStep += 1;
      if (currentStep < stepsCount) {
        setTypingStepIndex(currentStep);
      }
    }, 500);

    try {
      const intent = parseUserIntent(text);
      const finalPrompt = buildDesignPrompt(text, intent);

      // Keep core design choices in sync with chatbot intent for a coherent UX.
      setRoomType(intent.room);
      setStyle(intent.style);
      setMood(intent.mood);

      const response = await imageAPI.generateFromPrompt({
        prompt: finalPrompt,
        userInput: text,
        roomType: intent.room,
        style: intent.style,
        mood: intent.mood,
        budget: intent.budget,
        imageId: imageId || uploadedImage?.id,
        imageUrl: uploadedImage?.url,
        transformationStrength
      });

      clearInterval(stepTimer);

      if (response.data?.success && response.data?.image) {
        const generatedImage = normalizeBackendImageUrl(response.data.image);

        setGeneratedDesign({
          success: true,
          imageId: response.data.imageId || imageId || uploadedImage?.id || null,
          inputImage: uploadedImage?.url || normalizeBackendImageUrl(response.data.inputImage || ''),
          outputImage: generatedImage,
          image: generatedImage,
          provider: response.data.provider || 'unknown',
          model: response.data.model || 'unknown',
          prompt: response.data.prompt || finalPrompt,
          generatedAt: new Date().toISOString(),
          designData: {
            roomType: intent.room,
            style: intent.style,
            mood: intent.mood,
            budget: intent.budget,
            transformationStrength,
            source: 'chatbot'
          }
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'bot',
            text: `Done. I generated an AI inspired redesign for your ${intent.style} ${intent.room} concept around Rs ${intent.budget.toLocaleString('en-IN')}.`
          },
          {
            id: `bot-image-${Date.now()}`,
            role: 'bot',
            type: 'image',
            text: 'AI Inspired Redesign',
            image: generatedImage
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            role: 'bot',
            text: 'I could not generate the redesign right now. Please try another prompt.'
          }
        ]);
      }

      setTyping(false);
      if (inputRef.current) inputRef.current.focus();
    } catch (error) {
      clearInterval(stepTimer);
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'bot',
          text: 'Image generation failed. Please try again in a moment.'
        }
      ]);
      setTyping(false);
    }
  };

  const promptButtons = useMemo(
    () =>
      quickPrompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => sendMessage(prompt)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-all"
        >
          {prompt}
        </button>
      )),
    [typing]
  );

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-4 py-3 text-white shadow-glow"
      >
        {isOpen ? <X size={18} /> : <MessageSquare size={18} />}
        <span className="text-sm font-semibold">AI Chat</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-5 z-50 w-[min(94vw,420px)] overflow-hidden rounded-3xl border border-white/40 bg-white/85 backdrop-blur-xl shadow-[0_20px_50px_rgba(30,41,59,0.22)]"
          >
            <header className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white">
                  <Bot size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">SpaceCraft AI Chatbot</p>
                  <p className="text-xs text-slate-500">Real-time API generation mode</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleChatImageUpload}
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 hover:border-indigo-300 disabled:opacity-50"
                >
                  <ImagePlus size={14} />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
                <Sparkles size={16} className="text-indigo-500" />
              </div>
            </header>

            <div ref={scrollRef} className="max-h-[54vh] space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <p>{message.text}</p>
                    {message.type === 'image' && message.image && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                        <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{message.text || 'Image Preview'}</p>
                        <img
                          src={message.image}
                          alt={message.text || 'Image Preview'}
                          className="w-full rounded-lg border border-slate-200 object-cover"
                        />
                      </div>
                    )}
                    {message.role === 'bot' && <BotResultCard payload={message.payload} />}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 [animation-delay:240ms]" />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{fakeAnalysisSteps[typingStepIndex]}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/70 px-4 py-3">
              {uploadedImage?.url && (
                <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  Room image ready: {uploadedImage.name || 'Uploaded image'}
                </div>
              )}

              <div className="mb-2 flex flex-wrap gap-2">{promptButtons}</div>

              <div className="mb-2 rounded-lg border border-slate-200 bg-white px-2 py-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Transformation Strength</p>
                <div className="flex gap-2">
                  {transformationStrengthOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTransformationStrength(option)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                        transformationStrength === option
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask: Design my bedroom in boho style under Rs 10k"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-indigo-400"
                />
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={() => sendMessage()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
