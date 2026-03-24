import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

const SUGGESTION_RULES = {
  chair: 'Add a study desk near chair',
  bed: 'Add side table or lamp',
  couch: 'Add coffee table in front',
  tv: 'Add TV unit or wall decor',
  pottedplant: 'Add more indoor plants for aesthetics',
  diningtable: 'Add pendant light above dining table',
  bookshelf: 'Add accent decor and reading lamp near shelf'
};

const ACTION_RULES = [
  { target: 'diningtable', item: 'Lamp', label: 'Add Lamp on table', color: '#f59e0b' },
  { target: 'bed', item: 'Lamp', label: 'Add bedside lamp', color: '#f59e0b' },
  { target: 'chair', item: 'Desk', label: 'Add desk near chair', color: '#22c55e' },
  { target: 'couch', item: 'Coffee Table', label: 'Add coffee table', color: '#38bdf8' },
  { target: 'tv', item: 'TV Unit', label: 'Add TV unit', color: '#a78bfa' },
  { target: 'bookshelf', item: 'Reading Lamp', label: 'Add reading lamp', color: '#fb7185' }
];

function normalizeClassName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z]/g, '');
}

function toRelevantDetections(predictions) {
  return predictions
    .filter((item) => item.class !== 'person')
    .map((item) => ({
      ...item,
      keyClass: normalizeClassName(item.class)
    }));
}

function getSuggestionsFromDetections(detections) {
  const suggestions = [];

  detections.forEach((item) => {
    const suggestion = SUGGESTION_RULES[item.keyClass];
    if (suggestion) suggestions.push(suggestion);
  });

  return [...new Set(suggestions)];
}

function getPlacementActionsFromDetections(detections) {
  const actions = ACTION_RULES.filter((rule) => detections.some((item) => item.keyClass === rule.target));
  return actions;
}

export default function LiveCamera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const detectionTimerRef = useRef(null);

  const [suggestions, setSuggestions] = useState([]);
  const [placementActions, setPlacementActions] = useState([]);
  const [detections, setDetections] = useState([]);
  const [placedItems, setPlacedItems] = useState([]);
  const [cameraError, setCameraError] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  const drawOverlay = (predictions, placements = []) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    const ctx = canvas.getContext('2d');
    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    predictions
      .forEach((item) => {
        const [x, y, w, h] = item.bbox;
        const boxX = Math.max(0, Math.round(x));
        const boxY = Math.max(0, Math.round(y));
        const boxW = Math.max(10, Math.round(w));
        const boxH = Math.max(10, Math.round(h));

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.95)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        const chipWidth = Math.max(104, item.class.length * 10 + 24);
        const chipHeight = 24;
        const chipX = boxX;
        const chipY = Math.max(4, boxY - chipHeight - 4);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(chipX, chipY, chipWidth, chipHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 13px sans-serif';
        ctx.fillText(item.class, chipX + 8, chipY + 16);
      });

    placements.forEach((placement) => {
      const px = Math.round(placement.x * width);
      const py = Math.round(placement.y * height);

      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = placement.color || '#f59e0b';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const label = `${placement.item} placed`;
      const labelWidth = Math.max(110, label.length * 7 + 16);
      const labelHeight = 24;
      const lx = Math.max(4, Math.min(width - labelWidth - 4, px + 12));
      const ly = Math.max(4, py - labelHeight / 2);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(lx, ly, labelWidth, labelHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(label, lx + 8, ly + 16);
    });
  };

  const detectObjects = async () => {
    if (!modelRef.current || !videoRef.current || !isCameraReady) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) return;

    try {
      const predictions = await modelRef.current.detect(videoRef.current);
      const relevantDetections = toRelevantDetections(predictions);
      const smartSuggestions = getSuggestionsFromDetections(relevantDetections);
      const actions = getPlacementActionsFromDetections(relevantDetections);

      setDetections(relevantDetections);
      setSuggestions(smartSuggestions);
      setPlacementActions(actions);
      drawOverlay(relevantDetections, placedItems);
    } catch (error) {
      // Keep UI responsive if one inference cycle fails.
      setSuggestions([]);
      setPlacementActions([]);
    }
  };

  const handleApplyPlacement = (action) => {
    const target = detections
      .filter((item) => item.keyClass === action.target)
      .sort((a, b) => (b.score || 0) - (a.score || 0))[0];

    if (!target || !videoRef.current?.videoWidth || !videoRef.current?.videoHeight) {
      return;
    }

    const [x, y, w, h] = target.bbox;
    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;

    const nextPlacement = {
      id: `${action.target}-${Date.now()}`,
      item: action.item,
      label: action.label,
      color: action.color,
      x: Math.max(0.03, Math.min(0.97, (x + w * 0.5) / width)),
      y: Math.max(0.05, Math.min(0.95, (y + h * 0.28) / height))
    };

    setPlacedItems((prev) => {
      const updated = [...prev, nextPlacement];
      drawOverlay(detections, updated);
      return updated;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment'
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        setCameraError('Camera access failed. Please allow camera permission and try again.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadModel = async () => {
      try {
        const model = await cocoSsd.load();
        if (cancelled) return;
        modelRef.current = model;
        setIsModelReady(true);
      } catch (error) {
        if (!cancelled) {
          setCameraError('Failed to load AI model. Please refresh and try again.');
        }
      }
    };

    loadModel();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isCameraReady || !isModelReady || cameraError) return undefined;

    detectObjects();
    detectionTimerRef.current = setInterval(() => {
      detectObjects();
    }, 2000);

    return () => {
      if (detectionTimerRef.current) {
        clearInterval(detectionTimerRef.current);
      }
    };
  }, [isCameraReady, isModelReady, cameraError]);

  useEffect(() => {
    if (detections.length > 0) {
      drawOverlay(detections, placedItems);
    }
  }, [placedItems]);

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-black">
      {cameraError ? (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <p className="text-sm text-rose-200">{cameraError}</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={() => {
              setIsCameraReady(true);
            }}
            className="w-full h-full object-cover"
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          <div className="absolute left-4 top-4 rounded-xl bg-black/60 px-4 py-2 text-white border border-white/20">
            <p className="text-sm font-semibold">Live AI Room Suggestions</p>
            <p className="text-xs text-slate-200">Realtime object-aware interior analysis</p>
          </div>

          <div className="absolute right-4 top-4 rounded-xl bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
            {isCameraReady && isModelReady ? 'ANALYZING LIVE' : 'INITIALIZING AI'}
          </div>

          <div className="absolute bottom-4 left-4 right-4 space-y-2">
            {suggestions.length === 0 && isCameraReady && isModelReady && (
              <div className="inline-block rounded-xl bg-black/70 px-3 py-2 text-xs text-slate-100 border border-white/20 pointer-events-none">
                No interior suggestions yet. Point camera at furniture like bed, chair, couch, TV, or plants.
              </div>
            )}

            {suggestions.map((item) => (
              <div
                key={item}
                className="inline-block mr-2 rounded-xl bg-black/70 text-white px-3 py-2 text-sm border border-emerald-300/40 pointer-events-none"
              >
                {item}
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              {placementActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => handleApplyPlacement(action)}
                  className="rounded-xl bg-emerald-500/90 px-3 py-2 text-xs font-semibold text-white border border-emerald-200/50 hover:bg-emerald-500"
                >
                  {action.label}
                </button>
              ))}

              {placedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPlacedItems([]);
                    drawOverlay(detections, []);
                  }}
                  className="rounded-xl bg-slate-800/90 px-3 py-2 text-xs font-semibold text-white border border-slate-200/30 hover:bg-slate-700"
                >
                  Clear Added Items
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
