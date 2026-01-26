import { z } from "zod";
export declare const WorkflowSchema: z.ZodEnum<["streamer", "writers_room", "brainstorm", "debate", "podcast"]>;
export declare const CaptureModeSchema: z.ZodEnum<["audio", "video", "av"]>;
export declare const ParticipantSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
}, {
    id: string;
    name: string;
}>;
export declare const SessionConfigSchema: z.ZodObject<{
    sessionId: z.ZodString;
    workflow: z.ZodEnum<["streamer", "writers_room", "brainstorm", "debate", "podcast"]>;
    captureMode: z.ZodEnum<["audio", "video", "av"]>;
    title: z.ZodOptional<z.ZodString>;
    participants: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
    }, {
        id: string;
        name: string;
    }>, "many">>;
    startedAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
    workflow: "streamer" | "writers_room" | "brainstorm" | "debate" | "podcast";
    captureMode: "audio" | "video" | "av";
    participants: {
        id: string;
        name: string;
    }[];
    startedAt: number;
    title?: string | undefined;
}, {
    sessionId: string;
    workflow: "streamer" | "writers_room" | "brainstorm" | "debate" | "podcast";
    captureMode: "audio" | "video" | "av";
    startedAt: number;
    title?: string | undefined;
    participants?: {
        id: string;
        name: string;
    }[] | undefined;
}>;
export type SessionConfig = z.infer<typeof SessionConfigSchema>;
