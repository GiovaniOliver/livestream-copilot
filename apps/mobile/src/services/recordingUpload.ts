/**
 * Recording Upload Service
 *
 * Handles uploading mobile recordings to the desktop companion,
 * with offline support, retry mechanism, and progress tracking.
 */

import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";
import { uploadLogger } from "./logger";

const UPLOAD_QUEUE_KEY = "@uploadQueue";
const SAVED_RECORDINGS_KEY = "@savedRecordings";
const DEVICE_ID_KEY = "@deviceId";

export interface UploadQueueItem {
  videoUri: string;
  sessionId: string;
  timestamp: string;
  retryCount: number;
  captureMode: string;
}

export interface SavedRecording {
  uri: string;
  timestamp: string;
  uploaded: boolean;
  sessionId?: string;
}

export interface UploadProgress {
  totalBytesSent: number;
  totalBytesExpectedToSend: number;
  percent: number;
}

/**
 * Get or create a unique device ID
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = `mobile-${Platform.OS}-${Date.now()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

/**
 * Upload a recording to the desktop companion
 */
export async function uploadRecording(
  videoUri: string,
  sessionId: string,
  companionUrl: string,
  authToken?: string,
  captureMode: string = "av",
  onProgress?: (progress: UploadProgress) => void
): Promise<{
  success: boolean;
  recording?: {
    id: string;
    filename: string;
    size: number;
  };
  error?: string;
}> {
  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("File does not exist");
    }

    // Get device ID
    const deviceId = await getDeviceId();

    // Upload with progress tracking
    const uploadResult = await FileSystem.uploadAsync(
      `${companionUrl}/api/sessions/${sessionId}/recordings/upload`,
      videoUri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "video",
        headers: authToken
          ? {
              Authorization: `Bearer ${authToken}`,
            }
          : {},
        parameters: {
          deviceId,
          timestamp: new Date().toISOString(),
          captureMode,
        },
        uploadProgressCallback: (progress) => {
          if (onProgress) {
            const percent =
              (progress.totalBytesSent / progress.totalBytesExpectedToSend) *
              100;
            onProgress({
              totalBytesSent: progress.totalBytesSent,
              totalBytesExpectedToSend: progress.totalBytesExpectedToSend,
              percent,
            });
          }
        },
      }
    );

    if (uploadResult.status === 200) {
      const result = JSON.parse(uploadResult.body);

      if (result.success) {
        // Delete local file after successful upload
        await FileSystem.deleteAsync(videoUri, { idempotent: true });

        return {
          success: true,
          recording: result.recording,
        };
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } else {
      throw new Error(`Upload failed with status ${uploadResult.status}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Save a recording locally for offline use
 */
export async function saveRecordingLocally(
  videoUri: string,
  sessionId?: string
): Promise<string> {
  const documentsDir = FileSystem.documentDirectory;
  if (!documentsDir) {
    throw new Error("Documents directory not available");
  }

  const recordingsDir = `${documentsDir}recordings/`;
  const localPath = `${recordingsDir}${Date.now()}.mp4`;

  // Create directory if needed
  await FileSystem.makeDirectoryAsync(recordingsDir, {
    intermediates: true,
  });

  // Move file to local storage
  await FileSystem.moveAsync({
    from: videoUri,
    to: localPath,
  });

  // Save to index
  const savedRecordings = await getSavedRecordings();
  savedRecordings.push({
    uri: localPath,
    timestamp: new Date().toISOString(),
    uploaded: false,
    sessionId,
  });

  await AsyncStorage.setItem(
    SAVED_RECORDINGS_KEY,
    JSON.stringify(savedRecordings)
  );

  return localPath;
}

/**
 * Get all saved recordings
 */
export async function getSavedRecordings(): Promise<SavedRecording[]> {
  const saved = await AsyncStorage.getItem(SAVED_RECORDINGS_KEY);
  return saved ? JSON.parse(saved) : [];
}

/**
 * Queue a recording for retry
 */
export async function queueForRetry(
  videoUri: string,
  sessionId: string,
  captureMode: string = "av"
): Promise<void> {
  const queue = await getUploadQueue();

  queue.push({
    videoUri,
    sessionId,
    timestamp: new Date().toISOString(),
    retryCount: 0,
    captureMode,
  });

  await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Get the upload queue
 */
export async function getUploadQueue(): Promise<UploadQueueItem[]> {
  const queue = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
  return queue ? JSON.parse(queue) : [];
}

/**
 * Retry queued uploads
 */
export async function retryQueuedUploads(
  companionUrl: string,
  authToken?: string,
  onProgress?: (item: UploadQueueItem, progress: UploadProgress) => void
): Promise<{
  succeeded: number;
  failed: number;
  remaining: number;
}> {
  const queue = await getUploadQueue();
  const remainingQueue: UploadQueueItem[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const result = await uploadRecording(
        item.videoUri,
        item.sessionId,
        companionUrl,
        authToken,
        item.captureMode,
        (progress) => {
          if (onProgress) {
            onProgress(item, progress);
          }
        }
      );

      if (result.success) {
        succeeded++;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      failed++;

      // Re-queue if under max retries
      if (item.retryCount < 3) {
        remainingQueue.push({
          ...item,
          retryCount: item.retryCount + 1,
        });
      } else {
        // Max retries reached - save locally
        try {
          await saveRecordingLocally(item.videoUri, item.sessionId);
        } catch (saveError) {
          uploadLogger.error("Failed to save recording locally:", saveError);
        }
      }
    }
  }

  // Update queue
  await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(remainingQueue));

  return {
    succeeded,
    failed,
    remaining: remainingQueue.length,
  };
}

/**
 * Check if network is available and reachable
 */
export async function isNetworkAvailable(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}

/**
 * Set up automatic retry when network becomes available
 */
export function setupNetworkListener(
  companionUrl: string,
  authToken?: string,
  onRetryComplete?: (result: {
    succeeded: number;
    failed: number;
    remaining: number;
  }) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener(async (state) => {
    if (state.isConnected && state.isInternetReachable) {
      const queue = await getUploadQueue();

      if (queue.length > 0) {
        const result = await retryQueuedUploads(companionUrl, authToken);

        if (onRetryComplete) {
          onRetryComplete(result);
        }
      }
    }
  });

  return unsubscribe;
}

/**
 * Clear saved recordings
 */
export async function clearSavedRecordings(): Promise<void> {
  await AsyncStorage.setItem(SAVED_RECORDINGS_KEY, JSON.stringify([]));
}

/**
 * Clear upload queue
 */
export async function clearUploadQueue(): Promise<void> {
  await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify([]));
}
