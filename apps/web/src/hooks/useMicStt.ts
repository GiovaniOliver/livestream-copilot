"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api/client";

type MicSttState = "idle" | "starting" | "active" | "stopping" | "error";

interface UseMicSttOptions {
  language?: string;
  interimResults?: boolean;
  diarization?: boolean;
  chunkMs?: number;
  targetSampleRate?: number;
}

interface UseMicSttResult {
  state: MicSttState;
  error: string | null;
  level: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

function downsampleBuffer(buffer: Float32Array, sampleRate: number, outRate: number): Float32Array {
  if (outRate === sampleRate) return buffer;
  const ratio = sampleRate / outRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      sum += buffer[i];
      count += 1;
    }
    result[offsetResult] = count ? sum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const output = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useMicStt(options: UseMicSttOptions = {}): UseMicSttResult {
  const {
    language = "en-US",
    interimResults = true,
    diarization = true,
    chunkMs = 250,
    targetSampleRate = 16000,
  } = options;

  const [state, setState] = useState<MicSttState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sendingRef = useRef(false);
  const lastSendRef = useRef(0);

  const cleanup = useCallback(() => {
    sendingRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (state === "starting" || state === "active") return;
    setError(null);
    setState("starting");

    try {
      await apiClient.post("/api/stt/start", {
        language,
        interimResults,
        diarization,
      });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser.");
      }

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!sendingRef.current) return;
        const now = Date.now();
        if (now - lastSendRef.current < chunkMs) return;
        lastSendRef.current = now;

        const input = event.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, audioContext.sampleRate, targetSampleRate);
        const pcm16 = floatTo16BitPCM(downsampled);

        let sumSquares = 0;
        for (let i = 0; i < downsampled.length; i += 1) {
          sumSquares += downsampled[i] * downsampled[i];
        }
        const rms = Math.sqrt(sumSquares / Math.max(1, downsampled.length));
        setLevel(rms);

        const base64 = bufferToBase64(pcm16.buffer);
        apiClient.post("/api/stt/audio", { audio: base64 }).catch(() => {});
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      sendingRef.current = true;
      setState("active");
    } catch (err) {
      cleanup();
      setError(err instanceof Error ? err.message : "Failed to start mic STT");
      setState("error");
    }
  }, [chunkMs, cleanup, diarization, interimResults, language, state, targetSampleRate]);

  const stop = useCallback(async () => {
    if (state === "stopping" || state === "idle") return;
    setState("stopping");

    try {
      await apiClient.post("/api/stt/stop");
    } catch {
      // ignore stop errors
    } finally {
      cleanup();
      setState("idle");
    }
  }, [cleanup, state]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return { state, error, level, start, stop };
}
