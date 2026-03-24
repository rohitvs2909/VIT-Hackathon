/**
 * Image Controller
 * Handles image upload, generation, and retrieval
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../uploads');
const POLLINATIONS_BASE = 'https://gen.pollinations.ai/image';
const DEFAULT_HUGGINGFACE_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';
const HUGGINGFACE_API_BASE = 'https://router.huggingface.co/hf-inference/models';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Store uploaded images metadata (in production, use database)
const uploadedImages = new Map();
const DEFAULT_CLOUDINARY_IMAGE_URL = 'https://res.cloudinary.com/dfja0xdwr/image/upload/v1774272851/WhatsApp_Image_2026-03-23_at_14.47.59_nlilbe.jpg';

function getHuggingFaceToken() {
  const token = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

  if (!token) {
    throw new Error('Hugging Face API token is not configured. Set HUGGINGFACE_API_KEY in backend/.env');
  }

  return token;
}

function buildPollinationsPrompt(userInput, context = {}) {
  const roomType = context.roomType || 'bedroom';
  const style = context.style || 'modern';
  const mood = context.mood || 'cozy';
  const budget = context.budget || 'medium';

  const baseInput = String(userInput || '').trim();
  const normalizedInput = baseInput || `Design this ${roomType} in ${style} style`;

  return `${normalizedInput},
interior design, same room layout inspiration,
same perspective, same layout inspiration,
inspired by the uploaded room photo composition,
keep core room geometry believable,
${style} furniture, aesthetic lighting,
clean arrangement, ${mood} atmosphere,
budget aware design under ${budget},
do not return the original unedited room photo,
show a visibly redesigned interior concept,
ultra realistic, high detail, 4k, professional photography`;
}

function normalizeTransformationStrength(value) {
  const normalized = String(value || 'medium').toLowerCase();
  if (normalized === 'low' || normalized === 'high') return normalized;
  return 'medium';
}

function getTransformationConfig(strength) {
  const normalized = normalizeTransformationStrength(strength);

  if (normalized === 'low') {
    return {
      strength: 'low',
      guidanceScale: 6.8,
      inferenceSteps: 28,
      instruction: 'Keep most room elements, apply light styling and decor changes.'
    };
  }

  if (normalized === 'high') {
    return {
      strength: 'high',
      guidanceScale: 10.5,
      inferenceSteps: 55,
      instruction: 'Strong redesign: replace furniture style, colors, textures, and lighting while preserving room geometry.'
    };
  }

  return {
    strength: 'medium',
    guidanceScale: 8.2,
    inferenceSteps: 38,
    instruction: 'Balanced redesign with clear visual changes and realistic composition.'
  };
}

function buildPollinationsImageUrl(prompt) {
  const seed = Date.now();
  const key = process.env.POLLINATIONS_API_KEY;
  const keyQuery = key ? `&key=${encodeURIComponent(key)}` : '';
  return `${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}?seed=${seed}&nologo=true&private=true${keyQuery}`;
}

async function generatePollinationsImage(prompt) {
  const condensedPrompt = String(prompt || '').replace(/\s+/g, ' ').trim();
  const sourceUrl = buildPollinationsImageUrl(condensedPrompt);

  const response = await axios.get(sourceUrl, {
    responseType: 'arraybuffer',
    timeout: 180000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: {
      Accept: 'image/*'
    }
  });

  const contentType = String(response.headers['content-type'] || '').toLowerCase();

  if (response.status >= 200 && response.status < 300 && contentType.startsWith('image/')) {
    const mimeType = contentType.includes('jpeg') ? 'image/jpeg' : contentType.includes('webp') ? 'image/webp' : 'image/png';
    return {
      outputImage: bufferToDataUri(response.data, mimeType),
      sourceUrl,
      contentType: mimeType
    };
  }

  const payload = parseJsonBuffer(response.data);
  const detail = payload?.error?.message || payload?.error || payload?.message || `Pollinations request failed with status ${response.status}`;
  throw new Error(detail);
}

async function generateBestAvailableImage({ inputImage, prompt, style, mood, model, preferImageToImage = false, transformationStrength = 'medium' }) {
  const hasHuggingFace = !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
  const sourceImageComparable = inputImage ? toModelImageInput(inputImage) : null;

  // If we have a source image, prefer img2img first to keep room structure while changing design.
  if (preferImageToImage && inputImage && hasHuggingFace) {
    try {
      const hfPrimary = await generateWithHuggingFace({ inputImage, prompt, style, mood, model, transformationStrength });
      if (areImagesExactlySame(hfPrimary.outputImage, sourceImageComparable)) {
        throw new Error('Generated output matched input image exactly; retrying with alternate provider');
      }
      return {
        outputImage: hfPrimary.outputImage,
        sourceUrl: null,
        provider: 'huggingface',
        model: hfPrimary.model
      };
    } catch (hfPrimaryError) {
      console.warn('Primary image-to-image generation failed, falling back:', hfPrimaryError.message);
    }
  }

  try {
    const pollinations = await generatePollinationsImage(prompt);
    return {
      outputImage: pollinations.outputImage,
      sourceUrl: pollinations.sourceUrl,
      provider: 'pollinations',
      model: 'pollinations-free'
    };
  } catch (pollinationsError) {
    if (!hasHuggingFace) {
      throw new Error(`Image generation failed: ${pollinationsError.message}`);
    }

    const hf = await generateWithHuggingFace({ inputImage, prompt, style, mood, model, transformationStrength });
    if (areImagesExactlySame(hf.outputImage, sourceImageComparable)) {
      throw new Error('Generated output matched input image exactly; try a stronger redesign prompt');
    }
    return {
      outputImage: hf.outputImage,
      sourceUrl: null,
      provider: 'huggingface-fallback',
      model: hf.model
    };
  }
}

function getHuggingFaceModel(model) {
  return model || process.env.HUGGINGFACE_MODEL || process.env.HF_IMAGE_MODEL || DEFAULT_HUGGINGFACE_MODEL;
}

function getPreferredProvider(provider) {
  if (provider) {
    const normalized = provider.toLowerCase();
    if (normalized === 'replicate') {
      return 'huggingface';
    }
    return normalized;
  }

  if (process.env.IMAGE_PROVIDER) {
    return process.env.IMAGE_PROVIDER.toLowerCase();
  }

  if (process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN) {
    return 'huggingface';
  }

  return 'mock';
}

function parseJsonBuffer(buffer) {
  try {
    const text = Buffer.isBuffer(buffer) ? buffer.toString('utf-8') : String(buffer || '');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function bufferToDataUri(buffer, mimeType = 'image/png') {
  return `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
}

function getRetrySecondsFromHfResponse(responseBody, fallback = 8) {
  if (!responseBody || typeof responseBody !== 'object') {
    return fallback;
  }

  const estimated = Number(responseBody.estimated_time);
  if (Number.isFinite(estimated) && estimated > 0) {
    return Math.ceil(estimated) + 1;
  }

  return fallback;
}

function persistUploadedFile(file) {
  if (!file) {
    return null;
  }

  const fileId = uuidv4();
  const ext = path.extname(file.originalname || '.jpg') || '.jpg';
  const filename = `${fileId}${ext}`;
  const filepath = path.join(uploadDir, filename);
  fs.writeFileSync(filepath, file.buffer);

  const imageData = {
    id: fileId,
    filename,
    filepath,
    url: `/api/images/uploads/${filename}`,
    originalName: file.originalname,
    uploadedAt: new Date().toISOString(),
    size: file.size
  };

  uploadedImages.set(fileId, imageData);
  return imageData;
}

function recoverImageById(imageId) {
  if (!imageId) return null;

  const cached = uploadedImages.get(imageId);
  if (cached) return cached;

  if (!fs.existsSync(uploadDir)) return null;

  const filename = fs.readdirSync(uploadDir).find((name) => name.startsWith(`${imageId}.`));
  if (!filename) return null;

  const filepath = path.join(uploadDir, filename);
  const stats = fs.statSync(filepath);
  const recovered = {
    id: imageId,
    filename,
    filepath,
    url: `/api/images/uploads/${filename}`,
    originalName: filename,
    uploadedAt: stats.birthtime?.toISOString?.() || new Date().toISOString(),
    size: stats.size
  };

  uploadedImages.set(imageId, recovered);
  return recovered;
}

function areImagesExactlySame(a, b) {
  if (!a || !b) return false;
  const normalize = (value) => String(value || '').replace(/\s+/g, '');
  return normalize(a) === normalize(b);
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatusCode(error) {
  const message = error?.message || '';

  if (message.includes('402') || message.toLowerCase().includes('insufficient credit') || message.toLowerCase().includes('payment required')) return 402;
  if (message.includes('429') || message.toLowerCase().includes('too many requests')) return 429;
  if (message.includes('422') || message.includes('400')) return 400;
  if (message.includes('404')) return 502;
  if (message.includes('401') || message.includes('403')) return 502;

  return 500;
}

function isProviderTemporarilyUnavailable(error) {
  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('insufficient credit') ||
    message.includes('payment required') ||
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('currently loading') ||
    message.includes('model is loading') ||
    message.includes('503')
  );
}

function getProviderFallbackMessage(error) {
  const message = (error?.message || '').toLowerCase();

  if (message.includes('insufficient credit') || message.includes('payment required') || message.includes('402')) {
    return 'Hugging Face billing/quota is insufficient. Please update your Hugging Face plan/quota and retry.';
  }

  if (message.includes('too many requests') || message.includes('rate limit') || message.includes('429')) {
    return 'Hugging Face is rate-limiting requests right now. Please retry after a short wait.';
  }

  if (message.includes('currently loading') || message.includes('model is loading') || message.includes('503')) {
    return 'Hugging Face model is loading. Please retry in a minute.';
  }

  if (message.includes('401') || message.includes('403') || message.includes('unauthorized') || message.includes('forbidden')) {
    return 'Hugging Face API token is invalid or lacks access for this model.';
  }

  return 'Hugging Face is temporarily unavailable. Please retry shortly.';
}

function getImageMimeType(imagePath) {
  const ext = path.extname(imagePath || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function toModelImageInput(inputImage) {
  if (!inputImage) {
    throw new Error('Missing input image for generation');
  }

  if (typeof inputImage === 'string' && (inputImage.startsWith('http://') || inputImage.startsWith('https://') || inputImage.startsWith('data:'))) {
    return inputImage;
  }

  if (typeof inputImage === 'string' && fs.existsSync(inputImage)) {
    const imageBuffer = fs.readFileSync(inputImage);
    const mimeType = getImageMimeType(inputImage);
    return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  }

  return inputImage;
}

async function generateWithHuggingFace({ inputImage, prompt, style, mood, model, transformationStrength = 'medium' }) {
  const token = getHuggingFaceToken();
  const modelName = getHuggingFaceModel(model);
  const endpoint = `${HUGGINGFACE_API_BASE}/${modelName}`;
  const strengthConfig = getTransformationConfig(transformationStrength);

  const refinedPrompt = `${prompt}\n\nInterior style: ${style || 'modern'}. Mood: ${mood || 'cozy'}. Transformation strength: ${strengthConfig.strength}. ${strengthConfig.instruction} Ultra realistic interior render, detailed lighting, high quality.`;
  const sourceImage = inputImage ? toModelImageInput(inputImage) : undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await axios.post(
      endpoint,
      {
        inputs: refinedPrompt,
        parameters: {
          guidance_scale: strengthConfig.guidanceScale,
          num_inference_steps: strengthConfig.inferenceSteps,
          negative_prompt: 'blurry, low quality, distorted, watermark, text artifacts'
        },
        options: {
          wait_for_model: true,
          use_cache: false
        },
        source_image: typeof sourceImage === 'string' && sourceImage.startsWith('data:') ? sourceImage : undefined
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'image/png',
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        validateStatus: () => true,
        timeout: 180000
      }
    );

    const contentType = String(response.headers['content-type'] || '').toLowerCase();

    if (response.status >= 200 && response.status < 300 && contentType.includes('image/')) {
      return {
        outputImage: bufferToDataUri(response.data, contentType.includes('jpeg') ? 'image/jpeg' : 'image/png'),
        model: modelName
      };
    }

    const jsonBody = parseJsonBuffer(response.data);
    const detail = jsonBody?.error || jsonBody?.detail || `Hugging Face request failed with status ${response.status}`;

    if (response.status === 503 && attempt < 2) {
      const waitSeconds = getRetrySecondsFromHfResponse(jsonBody, 12);
      await wait(waitSeconds * 1000);
      continue;
    }

    if (response.status === 429 && attempt < 2) {
      await wait(8000);
      continue;
    }

    throw new Error(`Hugging Face generation failed (${response.status}): ${detail}`);
  }

  throw new Error('Hugging Face model is still loading. Please retry in a minute.');
}

function resolveImageSource({ imageId, imageUrl, file }) {
  if (file) {
    const imageData = persistUploadedFile(file);
    return {
      imageId: imageData.id,
      inputImageUrl: imageData.url,
      modelInputImage: imageData.filepath,
      imageData
    };
  }

  if (imageId) {
    const imageData = recoverImageById(imageId);
    if (imageData) {
      return {
        imageId: imageData.id,
        inputImageUrl: imageData.url,
        modelInputImage: imageData.filepath,
        imageData
      };
    }

    // If the image id is stale (e.g. after restart), fall back to imageUrl if provided.
    if (!imageUrl) {
      throw new Error(`Image not found: ${imageId}`);
    }
  }

  if (imageUrl) {
    const uploadFilenameMatch = String(imageUrl).match(/\/images\/uploads\/([^/?#]+)/i);
    if (uploadFilenameMatch?.[1]) {
      const filename = uploadFilenameMatch[1];
      const filepath = path.join(uploadDir, filename);

      if (fs.existsSync(filepath)) {
        return {
          imageId: imageId || filename.replace(path.extname(filename), ''),
          inputImageUrl: `/api/images/uploads/${filename}`,
          modelInputImage: filepath,
          imageData: {
            id: imageId || filename.replace(path.extname(filename), ''),
            filename,
            filepath,
            url: `/api/images/uploads/${filename}`,
            originalName: filename,
            uploadedAt: new Date().toISOString(),
            size: fs.statSync(filepath).size
          }
        };
      }
    }

    return {
      imageId: imageId || uuidv4(),
      inputImageUrl: imageUrl,
      modelInputImage: imageUrl,
      imageData: null
    };
  }

  throw new Error('Missing image input. Provide one of: imageId, imageUrl, or roomImage file.');
}

function buildTransformationPrompt(designData) {
  const {
    roomType = 'living room',
    style = 'modern',
    mood = 'calm',
    budget = 'medium'
  } = designData || {};

  return `Transform the given room image based on the following user preferences:

Room Type: ${roomType}
Interior Style: ${style}
Mood/Ambience: ${mood}
Budget Level: ${budget}

Instructions:
- Redesign the space according to the selected style and mood
- Optimize layout for functionality and aesthetics
- Replace existing furniture with matching ${style} furniture
- Adjust colors, textures, and materials based on ${style} and ${mood}
- Enhance lighting to match the mood (e.g., warm, bright, cozy, dramatic)
- Add decor elements that align with the theme (art, plants, rugs, etc.)
- Ensure the design reflects the budget:
  • low -> simple, affordable materials
  • medium -> balanced aesthetics and cost
  • high -> premium, luxurious finishes

Constraints:
- Keep the original room structure intact
- Maintain realistic proportions
- Avoid over-cluttering (especially for minimal styles)

Rendering Style:
- ultra-realistic interior design
- high resolution
- soft shadows and natural lighting
- photorealistic 4K render

Output:
- visually appealing redesigned room matching user inputs`;
}

function createMockGeneratedImage(designData, fallbackMessage = 'Hugging Face is temporarily unavailable. Please retry shortly.') {
  const {
    roomType = 'room',
    style = 'modern',
    mood = 'calm',
    budget = 'medium'
  } = designData || {};

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="80" y="80" width="1120" height="560" rx="24" fill="#0f172a" opacity="0.45"/>
  <text x="100" y="170" fill="#e2e8f0" font-size="52" font-family="Arial, sans-serif" font-weight="700">AI Redesign Preview (Mock)</text>
  <text x="100" y="250" fill="#cbd5e1" font-size="34" font-family="Arial, sans-serif">Room: ${String(roomType)}</text>
  <text x="100" y="305" fill="#cbd5e1" font-size="34" font-family="Arial, sans-serif">Style: ${String(style)}</text>
  <text x="100" y="360" fill="#cbd5e1" font-size="34" font-family="Arial, sans-serif">Mood: ${String(mood)}</text>
  <text x="100" y="415" fill="#cbd5e1" font-size="34" font-family="Arial, sans-serif">Budget: ${String(budget)}</text>
  <text x="100" y="520" fill="#93c5fd" font-size="24" font-family="Arial, sans-serif">${String(fallbackMessage)}</text>
  <text x="100" y="565" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif">Generated at: ${timestamp}</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Upload room image
 */
export const uploadRoomImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file uploaded'
      });
    }

    const imageData = persistUploadedFile(req.file);

    return res.status(200).json({
      success: true,
      image: imageData,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Generate AI room design from uploaded image
 */
export const generateRoomDesign = async (req, res) => {
  try {
    const {
      imageId,
      imageUrl,
      roomType,
      style,
      mood,
      provider,
      prompt: customPrompt,
      model,
      transformationStrength = 'medium'
    } = req.body;

    if (!roomType || !style) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: roomType, style'
      });
    }

    const source = resolveImageSource({ imageId, imageUrl, file: null });
    const prompt = customPrompt || buildPollinationsPrompt(`Design my ${roomType} in ${style} style`, req.body);
    const generation = await generateBestAvailableImage({
      inputImage: source.modelInputImage,
      prompt,
      style,
      mood,
      model,
      transformationStrength
    });

    const result = {
      success: true,
      imageId: source.imageId,
      inputImage: source.inputImageUrl,
      outputImage: generation.outputImage,
      image: generation.outputImage,
      pollinationsUrl: generation.sourceUrl,
      provider: generation.provider,
      model: generation.model,
      generatedAt: new Date().toISOString(),
      generationTime: null,
      designData: req.body,
      prompt
    };

    if (source.imageData) {
      uploadedImages.set(source.imageId, {
        ...source.imageData,
        generatedImage: result.outputImage,
        generationResult: result
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generation error:', error);

    return res.status(getErrorStatusCode(error)).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Generate redesigned room image from uploaded file or URL
 * Endpoint target: /api/generate-image
 */
export const generateRoomImage = async (req, res) => {
  try {
    const {
      imageId,
      imageUrl,
      style = 'modern',
      mood = 'cozy',
      roomType = 'living room',
      prompt: customPrompt,
      model,
      provider,
      transformationStrength = 'medium'
    } = req.body;

    const source = resolveImageSource({ imageId, imageUrl, file: req.file });

    const prompt = customPrompt || buildPollinationsPrompt(`Design my ${roomType} in ${style} style`, {
      roomType,
      style,
      mood,
      ...req.body
    });
    const generation = await generateBestAvailableImage({
      inputImage: source.modelInputImage,
      prompt,
      style,
      mood,
      model,
      transformationStrength
    });

    const result = {
      success: true,
      imageId: source.imageId,
      inputImage: source.inputImageUrl,
      outputImage: generation.outputImage,
      image: generation.outputImage,
      pollinationsUrl: generation.sourceUrl,
      provider: generation.provider,
      model: generation.model,
      prompt,
      generatedAt: new Date().toISOString(),
      designData: {
        roomType,
        style,
        mood,
        ...req.body
      }
    };

    if (source.imageData) {
      uploadedImages.set(source.imageId, {
        ...source.imageData,
        generatedImage: result.outputImage,
        generationResult: result
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Generate image error:', error);

    return res.status(getErrorStatusCode(error)).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Generate redesigned image from fixed Cloudinary URL
 * Endpoint target: GET /api/generate-image
 */
export const generateImageFromCloudinary = async (req, res) => {
  try {
    const roomType = req.query.roomType || 'bedroom';
    const style = req.query.style || 'modern boho';
    const mood = req.query.mood || 'warm';

    const prompt = buildPollinationsPrompt(`Design this ${roomType} in ${style} style`, {
      roomType,
      style,
      mood,
      imageUrl: DEFAULT_CLOUDINARY_IMAGE_URL
    });
    const generation = await generateBestAvailableImage({
      inputImage: DEFAULT_CLOUDINARY_IMAGE_URL,
      prompt,
      style,
      mood,
      model: null,
      transformationStrength: req.query.transformationStrength || 'medium'
    });

    return res.status(200).json({
      success: true,
      image: generation.outputImage,
      outputImage: generation.outputImage,
      pollinationsUrl: generation.sourceUrl,
      provider: generation.provider,
      model: generation.model,
      inputImage: DEFAULT_CLOUDINARY_IMAGE_URL,
      prompt,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cloudinary generate image error:', error);

    return res.status(getErrorStatusCode(error)).json({
      success: false,
      error: error.message || 'Image generation failed'
    });
  }
};

/**
 * Generate image from prompt using Pollinations
 * Endpoint target: POST /api/generate-image
 */
export const generateImage = async (req, res) => {
  try {
    const {
      prompt,
      userInput,
      roomType,
      style,
      mood,
      budget,
      imageId,
      imageUrl,
      model,
      transformationStrength = 'medium'
    } = req.body || {};

    let source = null;
    if (imageId || imageUrl || req.file) {
      source = resolveImageSource({ imageId, imageUrl, file: req.file || null });
    }

    const hasSourceImage = !!source?.modelInputImage;
    const strengthConfig = getTransformationConfig(transformationStrength);

    const basePrompt = buildPollinationsPrompt(prompt || userInput, {
      roomType,
      style,
      mood,
      budget
    });

    const transformationPrompt = hasSourceImage
      ? `${buildTransformationPrompt({ roomType, style, mood, budget })}\n\nUser intent: ${String(prompt || userInput || 'Create a fresh redesign concept')}\n\nTransformation strength: ${strengthConfig.strength}. ${strengthConfig.instruction}\n\nImportant: preserve room geometry but clearly replace colors, materials, furniture style, lighting mood, and decor so the output is visibly different from the input photo.`
      : basePrompt;

    const generation = await generateBestAvailableImage({
      inputImage: source?.modelInputImage || null,
      prompt: transformationPrompt,
      style,
      mood,
      model: model || null,
      preferImageToImage: hasSourceImage,
      transformationStrength: strengthConfig.strength
    });

    return res.status(200).json({
      success: true,
      image: generation.outputImage,
      outputImage: generation.outputImage,
      imageId: source?.imageId || null,
      inputImage: source?.inputImageUrl || null,
      pollinationsUrl: generation.sourceUrl,
      provider: generation.provider,
      model: generation.model,
      transformationStrength: strengthConfig.strength,
      prompt: transformationPrompt
    });
  } catch (error) {
    console.error('Pollinations generate image error:', error);

    const fallbackPrompt = String(req.body?.prompt || req.body?.userInput || 'Create a redesigned hostel room concept');
    const fallbackImage = createMockGeneratedImage(
      {
        roomType: req.body?.roomType || 'hostel room',
        style: req.body?.style || 'modern',
        mood: req.body?.mood || 'cozy',
        budget: req.body?.budget || 'low'
      },
      'Live AI provider unavailable, generated fallback concept shown.'
    );

    return res.status(200).json({
      success: true,
      image: fallbackImage,
      outputImage: fallbackImage,
      provider: 'mock-fallback',
      prompt: fallbackPrompt
    });
  }
};

/**
 * Regenerate room design with different parameters (mocked)
 */
export const regenerateRoomDesign = async (req, res) => {
  return generateRoomDesign(req, res);
};

/**
 * Get image file
 */
export const getImage = (req, res) => {
  try {
    const { filename } = req.params;

    if (filename.includes('..')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const filepath = path.join(uploadDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    return res.sendFile(filepath);
  } catch (error) {
    console.error('Get image error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get provider status
 */
export const getProviderStatus = async (req, res) => {
  const activeProvider = 'pollinations';

  return res.status(200).json({
    success: true,
    providers: {
      pollinations: {
        provider: 'POLLINATIONS_PROVIDER',
        configured: true,
        model: 'pollinations-free',
        description: 'Image generation using Pollinations API (no key required)'
      }
    },
    activeProvider
  });
};

export default {
  uploadRoomImage,
  generateImage,
  generateRoomDesign,
  generateRoomImage,
  generateImageFromCloudinary,
  regenerateRoomDesign,
  getImage,
  getProviderStatus
};
