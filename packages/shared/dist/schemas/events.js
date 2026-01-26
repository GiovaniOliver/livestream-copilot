import { z } from "zod";
export const EventTypeSchema = z.enum([
    "SESSION_START",
    "SESSION_END",
    "TRANSCRIPT_SEGMENT",
    "MOMENT_MARKER",
    "CLIP_INTENT_START",
    "CLIP_INTENT_END",
    "ARTIFACT_CLIP_CREATED",
    "ARTIFACT_FRAME_CREATED",
    "OUTPUT_CREATED",
    "OUTPUT_VALIDATED",
]);
export const TranscriptSegmentPayloadSchema = z.object({
    speakerId: z.string().nullable().optional(),
    text: z.string(),
    // seconds from session start
    t0: z.number(),
    t1: z.number(),
});
export const MomentMarkerPayloadSchema = z.object({
    label: z.string(),
    t: z.number(),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().optional(),
});
export const ClipIntentPayloadSchema = z.object({
    t: z.number(),
    source: z.enum(["gesture", "voice", "button", "api"]).default("api"),
    confidence: z.number().min(0).max(1).optional(),
});
export const ArtifactClipPayloadSchema = z.object({
    artifactId: z.string(),
    path: z.string(),
    t0: z.number(),
    t1: z.number(),
    thumbnailArtifactId: z.string().optional(),
});
export const ArtifactFramePayloadSchema = z.object({
    artifactId: z.string(),
    path: z.string(),
    t: z.number(),
});
export const OutputCategorySchema = z.enum([
    "SOCIAL_POST",
    "CLIP_TITLE",
    "BEAT",
    "SCRIPT_INSERT",
    "CLAIM",
    "EVIDENCE_CARD",
    "CHAPTER_MARKER",
    "QUOTE",
    "ACTION_ITEM",
    "EPISODE_META",
    "MODERATOR_PROMPT",
    "IDEA_NODE",
]);
export const OutputPayloadSchema = z.object({
    outputId: z.string(),
    category: OutputCategorySchema,
    title: z.string().optional(),
    text: z.string(),
    refs: z.array(z.string()).default([]),
    meta: z.record(z.any()).default({}),
});
export const OutputValidatedPayloadSchema = z.object({
    outputId: z.string(),
    ok: z.boolean(),
    issues: z.array(z.string()).default([]),
});
export const SessionStartPayloadSchema = z.object({
    sessionId: z.string(),
    workflow: z.string(),
    title: z.string().optional(),
});
export const SessionEndPayloadSchema = z.object({
    sessionId: z.string(),
    duration: z.number().optional(),
    clipCount: z.number().optional(),
    outputCount: z.number().optional(),
});
export const EventPayloadSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("SESSION_START"), payload: SessionStartPayloadSchema }),
    z.object({ type: z.literal("SESSION_END"), payload: SessionEndPayloadSchema }),
    z.object({ type: z.literal("TRANSCRIPT_SEGMENT"), payload: TranscriptSegmentPayloadSchema }),
    z.object({ type: z.literal("MOMENT_MARKER"), payload: MomentMarkerPayloadSchema }),
    z.object({ type: z.literal("CLIP_INTENT_START"), payload: ClipIntentPayloadSchema }),
    z.object({ type: z.literal("CLIP_INTENT_END"), payload: ClipIntentPayloadSchema }),
    z.object({ type: z.literal("ARTIFACT_CLIP_CREATED"), payload: ArtifactClipPayloadSchema }),
    z.object({ type: z.literal("ARTIFACT_FRAME_CREATED"), payload: ArtifactFramePayloadSchema }),
    z.object({ type: z.literal("OUTPUT_CREATED"), payload: OutputPayloadSchema }),
    z.object({ type: z.literal("OUTPUT_VALIDATED"), payload: OutputValidatedPayloadSchema }),
]);
export const ObservabilitySchema = z.object({
    provider: z.enum(["opik"]).default("opik"),
    traceId: z.string().optional(),
    spanId: z.string().optional(),
    // Optional link for UIs (e.g., Opik trace URL in cloud/self-hosted deployments)
    url: z.string().url().optional(),
});
export const EventEnvelopeSchema = z.object({
    id: z.string(),
    sessionId: z.string().optional(), // Optional for SESSION_START events
    ts: z.number(),
    observability: ObservabilitySchema.optional(),
}).and(EventPayloadSchema);
