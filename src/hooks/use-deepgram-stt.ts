"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseDeepgramSTTOptions {
  language?: string;
}

interface UseDeepgramSTTReturn {
  isConnected: boolean;
  isConnecting: boolean;
  partialTranscript: string;
  committedTranscript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  clearTranscript: () => void;
}

export function useDeepgramSTT(
  options: UseDeepgramSTTOptions = {}
): UseDeepgramSTTReturn {
  const { language = "ja" } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const [committedTranscript, setCommittedTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setPartialTranscript("");
  }, [cleanup]);

  const start = useCallback(async () => {
    if (socketRef.current) {
      stop();
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Get API key from server
      const keyResponse = await fetch("/api/deepgram/key", {
        method: "POST",
      });

      if (!keyResponse.ok) {
        throw new Error("Deepgram APIキーの取得に失敗しました");
      }

      const { key } = await keyResponse.json();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Connect to Deepgram WebSocket
      const params = new URLSearchParams({
        model: "nova-3",
        language,
        punctuate: "true",
        interim_results: "true",
        endpointing: "300",
        vad_events: "true",
        smart_format: "true",
      });

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ["token", key]
      );

      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);

        // Start recording and sending audio
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (
            event.data.size > 0 &&
            socket.readyState === WebSocket.OPEN
          ) {
            socket.send(event.data);
          }
        };

        // Send chunks every 250ms for low latency
        recorder.start(250);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "Results") {
            const transcript =
              data.channel?.alternatives?.[0]?.transcript ?? "";

            if (data.is_final) {
              // Final result for this segment
              if (transcript.trim()) {
                setCommittedTranscript((prev) =>
                  prev ? prev + transcript.trim() : transcript.trim()
                );
              }
              setPartialTranscript("");
            } else {
              // Interim result
              setPartialTranscript(transcript);
            }
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      socket.onerror = () => {
        setError("音声認識でエラーが発生しました");
        setIsConnecting(false);
        cleanup();
      };

      socket.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "音声認識の開始に失敗しました"
      );
      setIsConnecting(false);
      cleanup();
    }
  }, [language, stop, cleanup]);

  const clearTranscript = useCallback(() => {
    setCommittedTranscript("");
    setPartialTranscript("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    partialTranscript,
    committedTranscript,
    error,
    start,
    stop,
    clearTranscript,
  };
}
