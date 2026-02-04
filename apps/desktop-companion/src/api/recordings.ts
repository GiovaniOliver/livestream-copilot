/**
 * Recordings API Routes
 *
 * Handles mobile recording uploads and management.
 */

import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { prisma } from "../db/index.js";
import { createLogger } from "../logger/index.js";

const router = Router();
const logger = createLogger("recordings");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "mobile-recordings");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept video and audio files
    if (file.mimetype.startsWith("video/") || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video and audio files are allowed"));
    }
  },
});

/**
 * Upload a recording from mobile device
 * POST /api/sessions/:sessionId/recordings/upload
 */
router.post(
  "/:sessionId/recordings/upload",
  upload.single("video"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { deviceId, timestamp, captureMode } = req.body;

      if (!req.file) {
        logger.warn({ sessionId }, "No file uploaded");
        return res.status(400).json({
          success: false,
          error: "No file uploaded",
        });
      }

      logger.info(
        {
          sessionId,
          deviceId,
          filename: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
        "Recording upload received"
      );

      // Verify session exists
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        logger.warn({ sessionId }, "Session not found");
        return res.status(404).json({
          success: false,
          error: "Session not found",
        });
      }

      // Create recording record in database
      const recording = await prisma.mobileRecording.create({
        data: {
          id: uuidv4(),
          sessionId,
          deviceId: deviceId || "unknown",
          filePath: req.file.path,
          filename: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          captureMode: captureMode || "av",
          uploadedAt: new Date(timestamp || Date.now()),
        },
      });

      logger.info(
        {
          recordingId: recording.id,
          sessionId,
          filename: recording.filename,
          size: recording.size,
        },
        "Recording saved successfully"
      );

      return res.json({
        success: true,
        recording: {
          id: recording.id,
          filename: recording.filename,
          size: recording.size,
          uploadedAt: recording.uploadedAt,
        },
      });
    } catch (error) {
      logger.error({ err: error, sessionId: req.params.sessionId }, "Upload failed");

      // Clean up file if it was uploaded
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
);

/**
 * List recordings for a session
 * GET /api/sessions/:sessionId/recordings
 */
router.get("/:sessionId/recordings", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const recordings = await prisma.mobileRecording.findMany({
      where: { sessionId },
      orderBy: { uploadedAt: "desc" },
    });

    return res.json({
      success: true,
      recordings,
      count: recordings.length,
      totalSize: recordings.reduce((acc, r) => acc + r.size, 0),
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.sessionId }, "Failed to list recordings");
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list recordings",
    });
  }
});

/**
 * Delete a recording
 * DELETE /api/sessions/:sessionId/recordings/:recordingId
 */
router.delete("/:sessionId/recordings/:recordingId", async (req, res) => {
  try {
    const { sessionId, recordingId } = req.params;

    const recording = await prisma.mobileRecording.findFirst({
      where: {
        id: recordingId,
        sessionId,
      },
    });

    if (!recording) {
      return res.status(404).json({
        success: false,
        error: "Recording not found",
      });
    }

    // Delete file from disk
    if (fs.existsSync(recording.filePath)) {
      fs.unlinkSync(recording.filePath);
    }

    // Delete from database
    await prisma.mobileRecording.delete({
      where: { id: recordingId },
    });

    logger.info({ recordingId, sessionId }, "Recording deleted");

    return res.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to delete recording");
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete recording",
    });
  }
});

export { router as recordingsRouter };
