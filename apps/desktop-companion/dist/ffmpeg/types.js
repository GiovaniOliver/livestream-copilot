/**
 * FFmpeg module types for clip trimming pipeline.
 * SOC-262: Implements clip trimming from OBS replay buffer.
 */
/**
 * Predefined output profiles.
 */
export const OUTPUT_PROFILES = {
    /** High quality archive format */
    archive: {
        name: 'archive',
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        outputOptions: [
            '-preset medium',
            '-crf 18',
            '-movflags +faststart',
        ],
    },
    /** Optimized for social media (Twitter/X, Instagram) */
    social: {
        name: 'social',
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        outputOptions: [
            '-preset fast',
            '-crf 23',
            '-maxrate 8M',
            '-bufsize 16M',
            '-movflags +faststart',
        ],
    },
    /** Web-optimized WebM format */
    web: {
        name: 'web',
        format: 'webm',
        videoCodec: 'libvpx-vp9',
        audioCodec: 'libopus',
        outputOptions: [
            '-crf 30',
            '-b:v 0',
            '-deadline good',
        ],
    },
};
/**
 * Error types for the ffmpeg module.
 */
export class FFmpegError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'FFmpegError';
    }
}
