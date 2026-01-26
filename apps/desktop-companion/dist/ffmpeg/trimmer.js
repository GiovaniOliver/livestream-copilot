/**
 * Main clip trimming logic for OBS replay buffer.
 * SOC-262: Trims replay buffer to exact clip timestamps.
 *
 * The replay buffer is a rolling buffer of the last N seconds (typically 300s/5min).
 * When CLIP_INTENT_END is triggered:
 * 1. OBS saves the replay buffer to disk
 * 2. We calculate the offset within the buffer based on:
 *    - When the buffer was saved (replayBufferSavedAt)
 *    - When the session started (sessionStartedAt)
 *    - The clip timestamps (t0, t1) relative to session start
 *    - The replay buffer duration (e.g., 300 seconds)
 * 3. We trim the buffer to extract just the clip
 * 4. We generate a thumbnail at the clip's midpoint
 */
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { FFmpegError, OUTPUT_PROFILES, } from './types.js';
import { probeVideo } from './probe.js';
import { generateThumbnailAtMidpoint } from './thumbnail.js';
/**
 * Configure ffmpeg path if provided via environment variable.
 */
export function configureFfmpeg(ffmpegPath) {
    if (ffmpegPath) {
        ffmpeg.setFfmpegPath(ffmpegPath);
    }
}
/**
 * Calculate the trim offsets within the replay buffer.
 *
 * The replay buffer contains the last N seconds of video. We need to calculate
 * where within this buffer our clip (t0, t1) falls.
 *
 * Timeline visualization:
 * ```
 * Session Start (t=0)
 * |---------------------|--------------|----------------------|
 *                       t0            t1                     bufferSavedAt
 *                       |<-- clip -->|
 *
 * Replay Buffer (last N seconds before save):
 * |--------------------------------------------------|
 * bufferStartTime                              bufferSavedAt
 * (bufferSavedAt - replayBufferSeconds)
 *
 * Offset within buffer = t0 - bufferStartTime
 * ```
 *
 * @param params - Calculation parameters
 * @returns Object with startOffset and endOffset in seconds
 */
export function calculateBufferOffsets(params) {
    const { t0, t1, sessionStartedAt, replayBufferSavedAt, replayBufferSeconds, actualBufferDuration, } = params;
    // Convert clip times (relative to session) to absolute Unix timestamps
    const clipStartAbsolute = sessionStartedAt + t0 * 1000;
    const clipEndAbsolute = sessionStartedAt + t1 * 1000;
    // Calculate when the replay buffer started recording
    // Use actual buffer duration if available (from ffprobe), otherwise use configured value
    const bufferDuration = actualBufferDuration ?? replayBufferSeconds;
    const bufferStartAbsolute = replayBufferSavedAt - bufferDuration * 1000;
    // Calculate offsets within the buffer
    const startOffset = Math.max(0, (clipStartAbsolute - bufferStartAbsolute) / 1000);
    const endOffset = Math.min(bufferDuration, (clipEndAbsolute - bufferStartAbsolute) / 1000);
    // Validate offsets
    if (startOffset >= bufferDuration) {
        throw new FFmpegError('Clip start time is beyond the replay buffer. The moment may have occurred before the buffer started.', 'INVALID_TIMESTAMPS', { t0, t1, startOffset, endOffset, bufferDuration });
    }
    if (endOffset <= 0) {
        throw new FFmpegError('Clip end time is before the replay buffer starts. This should not happen.', 'INVALID_TIMESTAMPS', { t0, t1, startOffset, endOffset, bufferDuration });
    }
    if (startOffset >= endOffset) {
        throw new FFmpegError('Invalid clip timestamps: start must be before end', 'INVALID_TIMESTAMPS', { t0, t1, startOffset, endOffset });
    }
    return {
        startOffset: Math.max(0, startOffset),
        endOffset: Math.min(bufferDuration, endOffset),
        clipDuration: endOffset - startOffset,
    };
}
/**
 * Trim a video file using ffmpeg.
 *
 * @param inputPath - Path to input video
 * @param outputPath - Path for output video
 * @param startOffset - Start time in seconds
 * @param duration - Duration in seconds
 * @param profile - Output profile to use
 * @returns Promise resolving when trimming is complete
 */
async function trimVideo(inputPath, outputPath, startOffset, duration, profile) {
    return new Promise((resolve, reject) => {
        const command = ffmpeg(inputPath)
            .setStartTime(startOffset)
            .setDuration(duration)
            .videoCodec(profile.videoCodec)
            .audioCodec(profile.audioCodec)
            .outputOptions(profile.outputOptions)
            .output(outputPath);
        command
            .on('start', (cmdLine) => {
            console.log('[ffmpeg] Spawned command:', cmdLine);
        })
            .on('progress', (progress) => {
            if (progress.percent) {
                console.log(`[ffmpeg] Progress: ${Math.round(progress.percent)}%`);
            }
        })
            .on('error', (err, stdout, stderr) => {
            console.error('[ffmpeg] Error:', err.message);
            console.error('[ffmpeg] stderr:', stderr);
            reject(new FFmpegError(`Video trimming failed: ${err.message}`, 'TRIM_FAILED', { inputPath, outputPath, startOffset, duration, stderr }));
        })
            .on('end', () => {
            console.log('[ffmpeg] Trimming complete:', outputPath);
            resolve();
        })
            .run();
    });
}
/**
 * Main clip trimming function.
 *
 * Takes a replay buffer file and extracts a clip based on session-relative timestamps.
 * Also generates a thumbnail at the clip's midpoint.
 *
 * @param input - Trim clip input parameters
 * @returns Promise resolving to trim result with paths and metadata
 * @throws FFmpegError if trimming fails
 *
 * @example
 * ```typescript
 * const result = await trimClip({
 *   replayBufferPath: '/path/to/replay.mp4',
 *   t0: 120,  // 2 minutes into session
 *   t1: 150,  // 2.5 minutes into session
 *   sessionDir: './sessions/abc123',
 *   artifactId: 'clip-uuid',
 *   sessionStartedAt: Date.now() - 180000,  // session started 3 min ago
 *   replayBufferSavedAt: Date.now(),
 *   replayBufferSeconds: 300,
 * });
 * ```
 */
export async function trimClip(input) {
    const { replayBufferPath, t0, t1, sessionDir, artifactId, format = 'mp4', replayBufferSavedAt = Date.now(), sessionStartedAt = Date.now() - 300000, // Default: assume session started 5 min ago
    replayBufferSeconds = 300, } = input;
    // Validate input file exists
    if (!fs.existsSync(replayBufferPath)) {
        throw new FFmpegError(`Replay buffer file not found: ${replayBufferPath}`, 'INPUT_FILE_NOT_FOUND', { replayBufferPath });
    }
    // Validate timestamps
    if (t0 < 0 || t1 < 0) {
        throw new FFmpegError('Clip timestamps must be non-negative', 'INVALID_TIMESTAMPS', { t0, t1 });
    }
    if (t0 >= t1) {
        throw new FFmpegError('Clip start time must be before end time', 'INVALID_TIMESTAMPS', { t0, t1 });
    }
    // Get actual buffer duration from the file
    console.log('[ffmpeg] Probing replay buffer:', replayBufferPath);
    const bufferMetadata = await probeVideo(replayBufferPath);
    console.log('[ffmpeg] Buffer duration:', bufferMetadata.duration, 'seconds');
    // Calculate offsets within the buffer
    const offsets = calculateBufferOffsets({
        t0,
        t1,
        sessionStartedAt,
        replayBufferSavedAt,
        replayBufferSeconds,
        actualBufferDuration: bufferMetadata.duration,
    });
    console.log('[ffmpeg] Calculated offsets:', offsets);
    // Ensure output directories exist
    const clipsDir = path.join(sessionDir, 'clips');
    const thumbnailsDir = path.join(sessionDir, 'thumbnails');
    try {
        fs.mkdirSync(clipsDir, { recursive: true });
        fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    catch (err) {
        throw new FFmpegError(`Failed to create output directories`, 'OUTPUT_DIR_ERROR', { clipsDir, thumbnailsDir, error: err });
    }
    // Determine output paths
    const clipFilename = `${artifactId}.${format}`;
    const thumbnailFilename = `${artifactId}.jpg`;
    const clipPath = path.join(clipsDir, clipFilename);
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
    // Get output profile
    const profile = OUTPUT_PROFILES.archive; // Default to archive quality
    // Trim the video
    console.log('[ffmpeg] Trimming clip:', {
        input: replayBufferPath,
        output: clipPath,
        startOffset: offsets.startOffset,
        duration: offsets.clipDuration,
    });
    await trimVideo(replayBufferPath, clipPath, offsets.startOffset, offsets.clipDuration, profile);
    // Generate thumbnail at midpoint
    console.log('[ffmpeg] Generating thumbnail at midpoint');
    await generateThumbnailAtMidpoint(clipPath, thumbnailPath, offsets.clipDuration);
    // Get metadata of the output clip
    const clipMetadata = await probeVideo(clipPath);
    return {
        clipPath,
        thumbnailPath,
        duration: offsets.clipDuration,
        metadata: clipMetadata,
    };
}
/**
 * Simplified trim function for when you already know the exact offsets.
 * Use this when you have direct control over the timing.
 *
 * @param inputPath - Path to input video
 * @param outputDir - Directory for output files
 * @param artifactId - Unique ID for naming
 * @param startOffset - Start offset in seconds within the input file
 * @param endOffset - End offset in seconds within the input file
 * @param format - Output format
 * @returns Promise resolving to trim result
 */
export async function trimClipDirect(inputPath, outputDir, artifactId, startOffset, endOffset, format = 'mp4') {
    // Validate input file exists
    if (!fs.existsSync(inputPath)) {
        throw new FFmpegError(`Input file not found: ${inputPath}`, 'INPUT_FILE_NOT_FOUND', { inputPath });
    }
    const duration = endOffset - startOffset;
    if (duration <= 0) {
        throw new FFmpegError('Invalid offsets: end must be after start', 'INVALID_TIMESTAMPS', { startOffset, endOffset });
    }
    // Ensure output directories exist
    const clipsDir = path.join(outputDir, 'clips');
    const thumbnailsDir = path.join(outputDir, 'thumbnails');
    try {
        fs.mkdirSync(clipsDir, { recursive: true });
        fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    catch (err) {
        throw new FFmpegError(`Failed to create output directories`, 'OUTPUT_DIR_ERROR', { clipsDir, thumbnailsDir, error: err });
    }
    // Determine output paths
    const clipPath = path.join(clipsDir, `${artifactId}.${format}`);
    const thumbnailPath = path.join(thumbnailsDir, `${artifactId}.jpg`);
    // Get output profile
    const profile = OUTPUT_PROFILES.archive;
    // Trim the video
    await trimVideo(inputPath, clipPath, startOffset, duration, profile);
    // Generate thumbnail at midpoint
    await generateThumbnailAtMidpoint(clipPath, thumbnailPath, duration);
    // Get metadata of the output clip
    const clipMetadata = await probeVideo(clipPath);
    return {
        clipPath,
        thumbnailPath,
        duration,
        metadata: clipMetadata,
    };
}
/**
 * Check if ffmpeg is available.
 *
 * @returns Promise resolving to true if ffmpeg is available
 */
export async function isFFmpegAvailable() {
    return new Promise((resolve) => {
        ffmpeg.getAvailableFormats((err) => {
            resolve(!err);
        });
    });
}
