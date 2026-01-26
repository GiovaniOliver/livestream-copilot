import { z } from "zod";
export declare const EventTypeSchema: z.ZodEnum<["TRANSCRIPT_SEGMENT", "MOMENT_MARKER", "CLIP_INTENT_START", "CLIP_INTENT_END", "ARTIFACT_CLIP_CREATED", "ARTIFACT_FRAME_CREATED", "OUTPUT_CREATED", "OUTPUT_VALIDATED"]>;
export declare const TranscriptSegmentPayloadSchema: z.ZodObject<{
    speakerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    text: z.ZodString;
    t0: z.ZodNumber;
    t1: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    text: string;
    t0: number;
    t1: number;
    speakerId?: string | null | undefined;
}, {
    text: string;
    t0: number;
    t1: number;
    speakerId?: string | null | undefined;
}>;
export declare const MomentMarkerPayloadSchema: z.ZodObject<{
    label: z.ZodString;
    t: z.ZodNumber;
    confidence: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    label: string;
    t: number;
    confidence?: number | undefined;
    notes?: string | undefined;
}, {
    label: string;
    t: number;
    confidence?: number | undefined;
    notes?: string | undefined;
}>;
export declare const ClipIntentPayloadSchema: z.ZodObject<{
    t: z.ZodNumber;
    source: z.ZodDefault<z.ZodEnum<["gesture", "voice", "button", "api"]>>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    t: number;
    source: "gesture" | "voice" | "button" | "api";
    confidence?: number | undefined;
}, {
    t: number;
    confidence?: number | undefined;
    source?: "gesture" | "voice" | "button" | "api" | undefined;
}>;
export declare const ArtifactClipPayloadSchema: z.ZodObject<{
    artifactId: z.ZodString;
    path: z.ZodString;
    t0: z.ZodNumber;
    t1: z.ZodNumber;
    thumbnailArtifactId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    t0: number;
    t1: number;
    path: string;
    artifactId: string;
    thumbnailArtifactId?: string | undefined;
}, {
    t0: number;
    t1: number;
    path: string;
    artifactId: string;
    thumbnailArtifactId?: string | undefined;
}>;
export declare const ArtifactFramePayloadSchema: z.ZodObject<{
    artifactId: z.ZodString;
    path: z.ZodString;
    t: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    path: string;
    t: number;
    artifactId: string;
}, {
    path: string;
    t: number;
    artifactId: string;
}>;
export declare const OutputCategorySchema: z.ZodEnum<["SOCIAL_POST", "CLIP_TITLE", "BEAT", "SCRIPT_INSERT", "CLAIM", "EVIDENCE_CARD", "CHAPTER_MARKER", "QUOTE", "ACTION_ITEM", "EPISODE_META", "MODERATOR_PROMPT", "IDEA_NODE"]>;
export declare const OutputPayloadSchema: z.ZodObject<{
    outputId: z.ZodString;
    category: z.ZodEnum<["SOCIAL_POST", "CLIP_TITLE", "BEAT", "SCRIPT_INSERT", "CLAIM", "EVIDENCE_CARD", "CHAPTER_MARKER", "QUOTE", "ACTION_ITEM", "EPISODE_META", "MODERATOR_PROMPT", "IDEA_NODE"]>;
    title: z.ZodOptional<z.ZodString>;
    text: z.ZodString;
    refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    meta: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    text: string;
    outputId: string;
    category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
    refs: string[];
    meta: Record<string, any>;
    title?: string | undefined;
}, {
    text: string;
    outputId: string;
    category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
    title?: string | undefined;
    refs?: string[] | undefined;
    meta?: Record<string, any> | undefined;
}>;
export declare const OutputValidatedPayloadSchema: z.ZodObject<{
    outputId: z.ZodString;
    ok: z.ZodBoolean;
    issues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    issues: string[];
    outputId: string;
    ok: boolean;
}, {
    outputId: string;
    ok: boolean;
    issues?: string[] | undefined;
}>;
export declare const EventPayloadSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"TRANSCRIPT_SEGMENT">;
    payload: z.ZodObject<{
        speakerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        text: z.ZodString;
        t0: z.ZodNumber;
        t1: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    }, {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "TRANSCRIPT_SEGMENT";
    payload: {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    };
}, {
    type: "TRANSCRIPT_SEGMENT";
    payload: {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"MOMENT_MARKER">;
    payload: z.ZodObject<{
        label: z.ZodString;
        t: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    }, {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "MOMENT_MARKER";
    payload: {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    };
}, {
    type: "MOMENT_MARKER";
    payload: {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"CLIP_INTENT_START">;
    payload: z.ZodObject<{
        t: z.ZodNumber;
        source: z.ZodDefault<z.ZodEnum<["gesture", "voice", "button", "api"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    }, {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CLIP_INTENT_START";
    payload: {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    };
}, {
    type: "CLIP_INTENT_START";
    payload: {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"CLIP_INTENT_END">;
    payload: z.ZodObject<{
        t: z.ZodNumber;
        source: z.ZodDefault<z.ZodEnum<["gesture", "voice", "button", "api"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    }, {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CLIP_INTENT_END";
    payload: {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    };
}, {
    type: "CLIP_INTENT_END";
    payload: {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_CLIP_CREATED">;
    payload: z.ZodObject<{
        artifactId: z.ZodString;
        path: z.ZodString;
        t0: z.ZodNumber;
        t1: z.ZodNumber;
        thumbnailArtifactId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    }, {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ARTIFACT_CLIP_CREATED";
    payload: {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    };
}, {
    type: "ARTIFACT_CLIP_CREATED";
    payload: {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_FRAME_CREATED">;
    payload: z.ZodObject<{
        artifactId: z.ZodString;
        path: z.ZodString;
        t: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: string;
        t: number;
        artifactId: string;
    }, {
        path: string;
        t: number;
        artifactId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ARTIFACT_FRAME_CREATED";
    payload: {
        path: string;
        t: number;
        artifactId: string;
    };
}, {
    type: "ARTIFACT_FRAME_CREATED";
    payload: {
        path: string;
        t: number;
        artifactId: string;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"OUTPUT_CREATED">;
    payload: z.ZodObject<{
        outputId: z.ZodString;
        category: z.ZodEnum<["SOCIAL_POST", "CLIP_TITLE", "BEAT", "SCRIPT_INSERT", "CLAIM", "EVIDENCE_CARD", "CHAPTER_MARKER", "QUOTE", "ACTION_ITEM", "EPISODE_META", "MODERATOR_PROMPT", "IDEA_NODE"]>;
        title: z.ZodOptional<z.ZodString>;
        text: z.ZodString;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        meta: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        refs: string[];
        meta: Record<string, any>;
        title?: string | undefined;
    }, {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        title?: string | undefined;
        refs?: string[] | undefined;
        meta?: Record<string, any> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "OUTPUT_CREATED";
    payload: {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        refs: string[];
        meta: Record<string, any>;
        title?: string | undefined;
    };
}, {
    type: "OUTPUT_CREATED";
    payload: {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        title?: string | undefined;
        refs?: string[] | undefined;
        meta?: Record<string, any> | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"OUTPUT_VALIDATED">;
    payload: z.ZodObject<{
        outputId: z.ZodString;
        ok: z.ZodBoolean;
        issues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues: string[];
        outputId: string;
        ok: boolean;
    }, {
        outputId: string;
        ok: boolean;
        issues?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "OUTPUT_VALIDATED";
    payload: {
        issues: string[];
        outputId: string;
        ok: boolean;
    };
}, {
    type: "OUTPUT_VALIDATED";
    payload: {
        outputId: string;
        ok: boolean;
        issues?: string[] | undefined;
    };
}>]>;
export declare const ObservabilitySchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["opik"]>>;
    traceId: z.ZodOptional<z.ZodString>;
    spanId: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    provider: "opik";
    traceId?: string | undefined;
    spanId?: string | undefined;
    url?: string | undefined;
}, {
    provider?: "opik" | undefined;
    traceId?: string | undefined;
    spanId?: string | undefined;
    url?: string | undefined;
}>;
export declare const EventEnvelopeSchema: z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    sessionId: z.ZodString;
    ts: z.ZodNumber;
    observability: z.ZodOptional<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["opik"]>>;
        traceId: z.ZodOptional<z.ZodString>;
        spanId: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        provider: "opik";
        traceId?: string | undefined;
        spanId?: string | undefined;
        url?: string | undefined;
    }, {
        provider?: "opik" | undefined;
        traceId?: string | undefined;
        spanId?: string | undefined;
        url?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    sessionId: string;
    ts: number;
    observability?: {
        provider: "opik";
        traceId?: string | undefined;
        spanId?: string | undefined;
        url?: string | undefined;
    } | undefined;
}, {
    id: string;
    sessionId: string;
    ts: number;
    observability?: {
        provider?: "opik" | undefined;
        traceId?: string | undefined;
        spanId?: string | undefined;
        url?: string | undefined;
    } | undefined;
}>, z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"TRANSCRIPT_SEGMENT">;
    payload: z.ZodObject<{
        speakerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        text: z.ZodString;
        t0: z.ZodNumber;
        t1: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    }, {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "TRANSCRIPT_SEGMENT";
    payload: {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    };
}, {
    type: "TRANSCRIPT_SEGMENT";
    payload: {
        text: string;
        t0: number;
        t1: number;
        speakerId?: string | null | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"MOMENT_MARKER">;
    payload: z.ZodObject<{
        label: z.ZodString;
        t: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    }, {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "MOMENT_MARKER";
    payload: {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    };
}, {
    type: "MOMENT_MARKER";
    payload: {
        label: string;
        t: number;
        confidence?: number | undefined;
        notes?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"CLIP_INTENT_START">;
    payload: z.ZodObject<{
        t: z.ZodNumber;
        source: z.ZodDefault<z.ZodEnum<["gesture", "voice", "button", "api"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    }, {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CLIP_INTENT_START";
    payload: {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    };
}, {
    type: "CLIP_INTENT_START";
    payload: {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"CLIP_INTENT_END">;
    payload: z.ZodObject<{
        t: z.ZodNumber;
        source: z.ZodDefault<z.ZodEnum<["gesture", "voice", "button", "api"]>>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    }, {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "CLIP_INTENT_END";
    payload: {
        t: number;
        source: "gesture" | "voice" | "button" | "api";
        confidence?: number | undefined;
    };
}, {
    type: "CLIP_INTENT_END";
    payload: {
        t: number;
        confidence?: number | undefined;
        source?: "gesture" | "voice" | "button" | "api" | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_CLIP_CREATED">;
    payload: z.ZodObject<{
        artifactId: z.ZodString;
        path: z.ZodString;
        t0: z.ZodNumber;
        t1: z.ZodNumber;
        thumbnailArtifactId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    }, {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ARTIFACT_CLIP_CREATED";
    payload: {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    };
}, {
    type: "ARTIFACT_CLIP_CREATED";
    payload: {
        t0: number;
        t1: number;
        path: string;
        artifactId: string;
        thumbnailArtifactId?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"ARTIFACT_FRAME_CREATED">;
    payload: z.ZodObject<{
        artifactId: z.ZodString;
        path: z.ZodString;
        t: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        path: string;
        t: number;
        artifactId: string;
    }, {
        path: string;
        t: number;
        artifactId: string;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "ARTIFACT_FRAME_CREATED";
    payload: {
        path: string;
        t: number;
        artifactId: string;
    };
}, {
    type: "ARTIFACT_FRAME_CREATED";
    payload: {
        path: string;
        t: number;
        artifactId: string;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"OUTPUT_CREATED">;
    payload: z.ZodObject<{
        outputId: z.ZodString;
        category: z.ZodEnum<["SOCIAL_POST", "CLIP_TITLE", "BEAT", "SCRIPT_INSERT", "CLAIM", "EVIDENCE_CARD", "CHAPTER_MARKER", "QUOTE", "ACTION_ITEM", "EPISODE_META", "MODERATOR_PROMPT", "IDEA_NODE"]>;
        title: z.ZodOptional<z.ZodString>;
        text: z.ZodString;
        refs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        meta: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        refs: string[];
        meta: Record<string, any>;
        title?: string | undefined;
    }, {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        title?: string | undefined;
        refs?: string[] | undefined;
        meta?: Record<string, any> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "OUTPUT_CREATED";
    payload: {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        refs: string[];
        meta: Record<string, any>;
        title?: string | undefined;
    };
}, {
    type: "OUTPUT_CREATED";
    payload: {
        text: string;
        outputId: string;
        category: "SOCIAL_POST" | "CLIP_TITLE" | "BEAT" | "SCRIPT_INSERT" | "CLAIM" | "EVIDENCE_CARD" | "CHAPTER_MARKER" | "QUOTE" | "ACTION_ITEM" | "EPISODE_META" | "MODERATOR_PROMPT" | "IDEA_NODE";
        title?: string | undefined;
        refs?: string[] | undefined;
        meta?: Record<string, any> | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"OUTPUT_VALIDATED">;
    payload: z.ZodObject<{
        outputId: z.ZodString;
        ok: z.ZodBoolean;
        issues: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        issues: string[];
        outputId: string;
        ok: boolean;
    }, {
        outputId: string;
        ok: boolean;
        issues?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "OUTPUT_VALIDATED";
    payload: {
        issues: string[];
        outputId: string;
        ok: boolean;
    };
}, {
    type: "OUTPUT_VALIDATED";
    payload: {
        outputId: string;
        ok: boolean;
        issues?: string[] | undefined;
    };
}>]>>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
