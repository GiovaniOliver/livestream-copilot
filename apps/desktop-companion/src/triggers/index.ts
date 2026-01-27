/**
 * Triggers Module
 *
 * Auto-trigger system for automatic clip capture based on audio/visual cues.
 */

export {
  AudioTriggerService,
  getAudioTriggerService,
  type AudioTriggerEvent,
  type PhraseMatch,
  type AudioTriggerCallback,
} from "./audio-trigger.service.js";

export {
  AutoClipManager,
  getAutoClipManager,
  type TriggerEvent,
  type VisualTriggerEvent,
  type ManualTriggerEvent,
} from "./auto-clip-manager.js";

export {
  ClipQueueProcessor,
  getClipQueueProcessor,
  type ProcessorOptions,
} from "./clip-queue-processor.js";

export {
  VisualTriggerService,
  getVisualTriggerService,
  type VisualDetection,
  type VisualTriggerEvent as VisualTriggerServiceEvent,
  type VisualTriggerCallback,
  type VisualDetectionProvider,
  MediaPipeProvider,
  ClaudeVisionProvider,
} from "./visual-trigger.service.js";

export {
  FrameExtractor,
  createFrameExtractor,
  type FrameExtractorOptions,
} from "./frame-extractor.js";
