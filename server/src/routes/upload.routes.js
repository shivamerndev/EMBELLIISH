import express from 'express';
import upload from '../middlewares/upload.middleware.js';
import uploadService from '../services/upload.service.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import asyncHandler from '../core/asyncHandler.js';
import { sendSuccess } from '../utils/responseHandler.js';

const router = express.Router();
router.use(authMiddleware);

/**
 * Upload one or multiple files to S3 (or local fallback).
 * Accepts multipart/form-data with field name 'files' or 'file'.
 */
router.post(
  '/',
  upload.array('files', 20),
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    if (!files.length && req.file) {
      files.push(req.file);
    }

    const uploaded = await Promise.all(
      files.map((file) => uploadService.archive(file, req.user))
    );

    return sendSuccess(res, 'Files uploaded successfully', uploaded);
  })
);

export default router;
