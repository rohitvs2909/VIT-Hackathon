const roomKeywords = {
  'hostel room': ['hostel room', 'hostel', 'dorm room', 'dorm', 'pg room', 'student room'],
  bedroom: ['bedroom', 'sleep', 'bed space', 'room'],
  'living room': ['living room', 'living', 'hall', 'lounge'],
  study: ['study', 'workspace', 'work', 'office', 'desk']
};

const styleKeywords = {
  boho: ['boho', 'bohemian'],
  modern: ['modern', 'contemporary'],
  minimal: ['minimal', 'minimalist', 'clean'],
  scandinavian: ['scandinavian', 'nordic'],
  industrial: ['industrial', 'loft'],
  gaming: ['gaming', 'gamer', 'rgb']
};

const moodKeywords = {
  calm: ['calm', 'peaceful', 'soft'],
  luxury: ['luxury', 'premium', 'rich', 'opulent'],
  aesthetic: ['aesthetic', 'pretty', 'stylish'],
  cozy: ['cozy', 'warm', 'comfort'],
  productive: ['productive', 'focused', 'focus']
};

const responseOpeners = [
  'Great brief. I analyzed your request and generated a concept.',
  'Perfect. I created a design plan aligned with your constraints.',
  'Done. I prepared a realistic redesign direction for your room.'
];

const responseClosers = [
  'You can ask me to optimize this for storage, rental, or student life.',
  'Want a second variation with different materials and lighting?',
  'I can regenerate this with more minimal decor or stronger color contrast.'
];

export const fakeAnalysisSteps = [
  'Analyzing your room...',
  'Applying design style...',
  'Generating AI redesign...'
];

export function buildDesignPrompt(userInput, context = {}) {
  const styleHint = context.style ? `${context.style} furniture` : 'modern furniture';
  const moodHint = context.mood ? `${context.mood} atmosphere` : 'cozy atmosphere';
  const roomType = context.room ? `for a ${context.room}` : '';

  return `${userInput}${roomType ? `, ${roomType}` : ''},
interior design, same room layout inspiration,
same perspective, same layout inspiration,
${styleHint}, aesthetic lighting,
clean arrangement, ${moodHint},
ultra realistic, high detail, 4k, professional photography`;
}

export const designTemplates = [
  {
    id: 'boho-bedroom',
    room: 'bedroom',
    style: 'boho',
    image: '/images/boho-bedroom.svg',
    budget: 10000,
    summary: 'A cozy boho bedroom with warm tones, indoor plants, cane textures, and soft ambient lighting.',
    furniture: ['Low platform bed', 'Wooden desk', 'Rattan chair', 'Plants', 'Wall shelves'],
    score: 85
  },
  {
    id: 'modern-living',
    room: 'living room',
    style: 'modern',
    image: '/images/modern-living.svg',
    budget: 25000,
    summary: 'A modern living room with a clean layout, layered neutral tones, and focused accent lighting.',
    furniture: ['3-seater sofa', 'Coffee table', 'TV unit', 'Accent lamp'],
    score: 90
  },
  {
    id: 'minimal-study',
    room: 'study',
    style: 'minimal',
    image: '/images/minimal-study.svg',
    budget: 12000,
    summary: 'A minimal study setup with compact zoning, clutter-free surfaces, and a productivity-first layout.',
    furniture: ['Work desk', 'Ergonomic chair', 'Floating shelves', 'Pinboard'],
    score: 88
  },
  {
    id: 'gaming-bedroom',
    room: 'bedroom',
    style: 'gaming',
    image: '/images/gaming-bedroom.svg',
    budget: 18000,
    summary: 'A gaming-ready bedroom with layered lighting, cable-managed desk layout, and compact storage.',
    furniture: ['Gaming desk', 'Monitor riser', 'LED strips', 'Storage drawers', 'Bean bag'],
    score: 87
  }
];

function normalize(text) {
  return String(text || '').toLowerCase();
}

function detectFromMap(text, map, fallback) {
  const normalized = normalize(text);
  for (const [key, aliases] of Object.entries(map)) {
    if (aliases.some((alias) => normalized.includes(alias))) {
      return key;
    }
  }
  return fallback;
}

function detectBudget(text, fallback = 15000) {
  const normalized = normalize(text);

  // Matches: ₹10000, rs 12000, 10k, 10 k
  const rupeeMatch = normalized.match(/(?:₹|rs\.?\s?)(\d+(?:\.\d+)?)(k)?/i);
  if (rupeeMatch) {
    const base = Number(rupeeMatch[1]);
    return Math.round((rupeeMatch[2] ? base * 1000 : base));
  }

  const shortMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s?k\b/i);
  if (shortMatch) {
    return Math.round(Number(shortMatch[1]) * 1000);
  }

  const numericMatch = normalized.match(/\b(\d{4,6})\b/);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  return fallback;
}

function budgetBreakdown(total, room) {
  const weightsByRoom = {
    bedroom: { furniture: 0.42, lighting: 0.16, decor: 0.2, paintAndWalls: 0.12, misc: 0.1 },
    'living room': { furniture: 0.48, lighting: 0.14, decor: 0.18, paintAndWalls: 0.1, misc: 0.1 },
    study: { furniture: 0.45, lighting: 0.15, decor: 0.12, paintAndWalls: 0.1, misc: 0.18 }
  };

  const weights = weightsByRoom[room] || weightsByRoom.bedroom;
  const entries = Object.entries(weights);
  const result = {};
  let allocated = 0;

  entries.forEach(([key, value], idx) => {
    if (idx === entries.length - 1) {
      result[key] = total - allocated;
      return;
    }
    const amount = Math.round(total * value);
    result[key] = amount;
    allocated += amount;
  });

  return result;
}

function estimateScore(template, intentBudget) {
  const delta = Math.abs(intentBudget - template.budget);
  const budgetPenalty = Math.min(8, Math.round(delta / 5000));
  const randomSwing = Math.floor(Math.random() * 5) - 2;
  return Math.max(72, Math.min(96, template.score - budgetPenalty + randomSwing));
}

function getExtrasByStyle(style) {
  const extras = {
    boho: ['Jute rug', 'Macrame wall art', 'Terracotta planters'],
    modern: ['Track lights', 'Minimal curtains', 'Textured throw pillows'],
    minimal: ['Cable tray', 'Neutral organizer set', 'Slim floor lamp'],
    scandinavian: ['Oak side table', 'Linen curtains', 'Soft grey rug'],
    industrial: ['Metal wall shelf', 'Concrete planter', 'Edison lamp'],
    gaming: ['RGB light bar', 'Acoustic panel', 'Headphone stand']
  };
  return extras[style] || ['Accent mirror', 'Storage basket'];
}

function pickBestTemplate(room, style, budget) {
  const scored = designTemplates.map((template) => {
    let score = 0;
    if (template.room === room) score += 5;
    if (template.style === style) score += 5;
    score += Math.max(0, 4 - Math.round(Math.abs(template.budget - budget) / 8000));
    return { template, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].template;
}

export function parseUserIntent(message) {
  const room = detectFromMap(message, roomKeywords, 'bedroom');
  const style = detectFromMap(message, styleKeywords, 'modern');
  const mood = detectFromMap(message, moodKeywords, 'aesthetic');
  const budget = detectBudget(message, room === 'living room' ? 22000 : 12000);

  return { room, style, mood, budget };
}

export function generateChatResponse(message) {
  const intent = parseUserIntent(message);
  const template = pickBestTemplate(intent.room, intent.style, intent.budget);
  const score = estimateScore(template, intent.budget);

  const furniture = [
    ...template.furniture,
    ...getExtrasByStyle(intent.style).slice(0, 2)
  ];

  const text = `${responseOpeners[Math.floor(Math.random() * responseOpeners.length)]} Here is a ${intent.style} ${intent.room} concept under around Rs ${intent.budget.toLocaleString('en-IN')}. ${responseClosers[Math.floor(Math.random() * responseClosers.length)]}`;

  return {
    text,
    summary: template.summary,
    image: template.image,
    budgetBreakdown: budgetBreakdown(intent.budget, intent.room),
    furniture,
    score,
    intent,
    templateId: template.id
  };
}
