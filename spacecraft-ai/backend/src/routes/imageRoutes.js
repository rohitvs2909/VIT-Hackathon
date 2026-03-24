/**
 * Image Routes
 * Handles image upload, AI generation, and regeneration
 */

import express from 'express';
import upload from '../middleware/uploadMiddleware.js';
import {
	uploadRoomImage,
	generateImage,
	generateRoomDesign,
	generateRoomImage,
	generateImageFromCloudinary,
	regenerateRoomDesign,
	getImage,
	getProviderStatus
} from '../controllers/imageController.js';

const router = express.Router();

/**
 * POST /api/images/upload
 * Upload a room image
 * Returns: {imageId, filename, filepath, url, metadata}
 */
router.post('/upload', upload.single('roomImage'), uploadRoomImage);

/**
 * POST /api/images/generate
 * Generate AI-redesigned room image
 * Body: {
 *   imageId,
 *   roomType,
 *   style,
 *   mood,
 *   budget,
 *   purpose,
 *   priority,
 *   isStudentMode (optional),
 *   provider (optional, 'mock', 'openai', 'replicate')
 * }
 * Returns: {success, outputImage, prompt, designData, etc}
 */
router.post('/generate', generateRoomDesign);

/**
 * POST /api/images/generate-image
 * Generate AI-redesigned room image from imageId, imageUrl, or uploaded file
 * Body/form-data: { imageId | imageUrl | roomImage, style, mood, prompt }
 */
router.post('/generate-image', upload.single('roomImage'), generateRoomImage);
router.get('/generate-image', generateImageFromCloudinary);
router.post('/prompt-generate', generateImage);

/**
 * POST /api/images/regenerate
 * Regenerate with different parameters
 * Body: {imageId, roomType, style, mood, budget, priority, provider}
 * Returns: {success, outputImage, ...}
 */
router.post('/regenerate', regenerateRoomDesign);

/**
 * GET /api/images/uploads/:filename
 * Serve uploaded or generated images
 */
router.get('/uploads/:filename', getImage);

/**
 * GET /api/images/provider-status
 * Get status of all image generation providers
 */
router.get('/provider-status', getProviderStatus);

export default router;
