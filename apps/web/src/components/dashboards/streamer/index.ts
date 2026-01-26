// ============================================================
// Producer Desk Dashboard Components
// Live Streamer Workflow - FluxBoard Web App
// ============================================================

// Main Dashboard
export { ProducerDesk, default as ProducerDeskDefault } from "./ProducerDesk";

// Panel Components
export { ClipBin } from "./ClipBin";
export { PostQueue } from "./PostQueue";
export { MomentRail } from "./MomentRail";

// Card Components
export { ClipCard } from "./ClipCard";
export { PostCard } from "./PostCard";
export { MomentMarker } from "./MomentMarker";

// Types
export type {
  // Clip Types
  Clip,
  ClipStatus,
  ClipCardProps,
  ClipBinProps,
  // Post Types
  Post,
  PostStatus,
  Platform,
  PostCardProps,
  PostQueueProps,
  PlatformConfig,
  // Moment Types
  Moment,
  MomentType,
  MomentMarkerProps,
  MomentRailProps,
  MomentTypeConfig,
  // Dashboard Props
  ProducerDeskProps,
} from "./types";

// Configuration
export { PLATFORM_CONFIG, MOMENT_TYPE_CONFIG } from "./types";

// Mock Data (for development)
export {
  mockClips,
  mockPosts,
  mockMoments,
  MOCK_STREAM_DURATION,
} from "./mockData";
