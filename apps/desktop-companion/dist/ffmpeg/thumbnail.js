/**
 * Thumbnail generation from video clips.
 * SOC-262: Generates thumbnails at clip midpoint for preview.
 */
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { FFmpegError } from './types.js';
/**
 * Default thumbnail options.
 */
const DEFAULT_THUMBNAIL_OPTIONS = {
    width: 640,
    quality: 5,
    format: 'jpg',
};
/**
 * Generate a thumbnail from a video at a specific timestamp.
 *
 * @param videoPath - Path to the source video
 * @param outputPath - Path where thumbnail should be saved
 * @param timestamp - Time in seconds to capture the thumbnail
 * @param options - Thumbnail generation options
 * @returns Promise resolving to the output path
 * @throws FFmpegError if thumbnail generation fails
 */
export async function generateThumbnail(videoPath, outputPath, timestamp, options = {}) {
    // Verify input file exists
    if (!fs.existsSync(videoPath)) {
        throw new FFmpegError(`Video file not found: ${videoPath}`, 'INPUT_FILE_NOT_FOUND', { videoPath });
    }
    // Merge with defaults
    const opts = {
        ...DEFAULT_THUMBNAIL_OPTIONS,
        ...options,
    };
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    try {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    catch (err) {
        throw new FFmpegError(`Failed to create output directory: ${outputDir}`, 'OUTPUT_DIR_ERROR', { outputDir, error: err });
    }
    return new Promise((resolve, reject) => {
        const command = ffmpeg(videoPath)
            .seekInput(timestamp)
            .frames(1)
            .outputOptions([
            `-vf scale=${opts.width}:-1`,
            `-q:v ${opts.quality}`,
        ])
            .output(outputPath);
        command
            .on('error', (err) => {
            reject(new FFmpegError(`Thumbnail generation failed: ${err.message}`, 'THUMBNAIL_FAILED', { videoPath, outputPath, timestamp, error: err }));
        })
            .on('end', () => {
            resolve(outputPath);
        })
            .run();
    });
}
/**
 * Generate a thumbnail at the midpoint of a video.
 *
 * @param videoPath - Path to the source video
 * @param outputPath - Path where thumbnail should be saved
 * @param duration - Duration of the video in seconds
 * @param options - Thumbnail generation options
 * @returns Promise resolving to the output path
 */
export async function generateThumbnailAtMidpoint(videoPath, outputPath, duration, options = {}) {
    const midpoint = duration / 2;
    return generateThumbnail(videoPath, outputPath, midpoint, options);
}
/**
 * Generate multiple thumbnails from a video (sprite sheet style).
 * Useful for video preview hover effects.
 *
 * @param videoPath - Path to the source video
 * @param outputDir - Directory where thumbnails should be saved
 * @param count - Number of thumbnails to generate
 * @param options - Thumbnail generation options
 * @returns Promise resolving to array of thumbnail paths
 */
export async function generateThumbnailStrip(videoPath, outputDir, duration, count = 5, options = {}) {
    // Ensure output directory exists
    try {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    catch (err) {
        throw new FFmpegError(`Failed to create output directory: ${outputDir}`, 'OUTPUT_DIR_ERROR', { outputDir, error: err });
    }
    const opts = {
        ...DEFAULT_THUMBNAIL_OPTIONS,
        ...options,
    };
    const interval = duration / (count + 1);
    const paths = [];
    for (let i = 1; i <= count; i++) {
        const timestamp = interval * i;
        const filename = `thumb_${String(i).padStart(3, '0')}.${opts.format}`;
        const outputPath = path.join(outputDir, filename);
        await generateThumbnail(videoPath, outputPath, timestamp, opts);
        paths.push(outputPath);
    }
    return paths;
}
