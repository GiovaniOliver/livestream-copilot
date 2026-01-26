/**
 * Video Streaming Types
 *
 * Type definitions for MediaMTX video streaming management.
 */

/**
 * MediaMTX server configuration
 */
export interface MediaMTXConfig {
  /** RTMP ingest port (default: 1935) */
  rtmpPort: number;
  /** WebRTC playback port (default: 8889) */
  webrtcPort: number;
  /** HLS playback port (default: 8888) */
  hlsPort: number;
  /** API port (default: 9997) */
  apiPort: number;
  /** Whether video streaming is enabled */
  enabled: boolean;
}

/**
 * Video stream status returned by the API
 */
export interface VideoStreamStatus {
  /** Whether video streaming is enabled (binary exists) */
  enabled: boolean;
  /** Whether MediaMTX server is currently running */
  serverRunning: boolean;
  /** Whether an active stream is being ingested */
  streamActive: boolean;
  /** RTMP URL for OBS to stream to */
  rtmpIngestUrl: string;
  /** WebRTC playback URL */
  webrtcPlaybackUrl: string;
  /** HLS playback URL */
  hlsPlaybackUrl: string;
}

/**
 * MediaMTX API response for paths list
 */
export interface MediaMTXPathsResponse {
  itemCount: number;
  pageCount: number;
  items: MediaMTXPathItem[];
}

/**
 * MediaMTX path item from API
 */
export interface MediaMTXPathItem {
  name: string;
  confName: string;
  source: MediaMTXPathSource | null;
  ready: boolean;
  readyTime: string | null;
  tracks: MediaMTXTrack[];
  bytesReceived: number;
  bytesSent: number;
  readers: MediaMTXReader[];
}

/**
 * MediaMTX path source information
 */
export interface MediaMTXPathSource {
  type: string;
  id: string;
}

/**
 * MediaMTX track information
 */
export interface MediaMTXTrack {
  type: string;
  codec: string;
}

/**
 * MediaMTX reader information
 */
export interface MediaMTXReader {
  type: string;
  id: string;
}

/**
 * MediaMTX YAML configuration structure
 */
export interface MediaMTXYamlConfig {
  logLevel: string;
  logDestinations: string[];
  rtmp: boolean;
  rtmpAddress: string;
  webrtc: boolean;
  webrtcAddress: string;
  webrtcLocalUDPAddress: string;
  webrtcLocalTCPAddress: string;
  hls: boolean;
  hlsAddress: string;
  api: boolean;
  apiAddress: string;
  paths: {
    all: {
      publishUser?: string;
      publishPass?: string;
      publishIPs?: string[];
    };
  };
}
