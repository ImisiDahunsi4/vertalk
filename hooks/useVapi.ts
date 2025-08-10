"use client";

import { assistant } from "@/assistants/assistant";

import {
  Message,
  MessageTypeEnum,
  TranscriptMessage,
  TranscriptMessageTypeEnum,
} from "@/lib/types/conversation.type";
import { useEffect, useState } from "react";
// import { MessageActionTypeEnum, useMessages } from "./useMessages";
import { vapi } from "@/lib/vapi.sdk";

export enum CALL_STATUS {
  INACTIVE = "inactive",
  ACTIVE = "active",
  LOADING = "loading",
}

export function useVapi() {
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CALL_STATUS>(
    CALL_STATUS.INACTIVE
  );

  const [messages, setMessages] = useState<Message[]>([]);

  const [activeTranscript, setActiveTranscript] =
    useState<TranscriptMessage | null>(null);

  const [audioLevel, setAudioLevel] = useState(0);

  // States for real-time events
  const [callId, setCallId] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const onSpeechStart = () => setIsSpeechActive(true);
    const onSpeechEnd = () => {
      console.log("Speech has ended");
      setIsSpeechActive(false);
    };

    const onCallStartHandler = (call: any) => {
      console.log("Call has started", call);
      setCallStatus(CALL_STATUS.ACTIVE);
      // Vapi provides the call object on start, which has the id.
      const id = call?.id || call?.sid;
      if (id) {
        setCallId(id);
      }
    };

    const onCallEnd = () => {
      console.log("Call has stopped");
      setCallStatus(CALL_STATUS.INACTIVE);
      setCallId(null); // Clear callId on end
      setEvents([]); // Clear events on end
    };

    const onVolumeLevel = (volume: number) => {
      setAudioLevel(volume);
    };

    const onMessageUpdate = (message: Message) => {
      console.log("message", message);
      if (
        message.type === MessageTypeEnum.TRANSCRIPT &&
        message.transcriptType === TranscriptMessageTypeEnum.PARTIAL
      ) {
        setActiveTranscript(message);
      } else {
        setMessages((prev) => [...prev, message]);
        setActiveTranscript(null);
      }
    };

    const onError = (e: any) => {
      setCallStatus(CALL_STATUS.INACTIVE);
      console.error(e);
    };

    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("call-start", onCallStartHandler);
    vapi.on("call-end", onCallEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("message", onMessageUpdate);
    vapi.on("error", onError);

    return () => {
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("call-start", onCallStartHandler);
      vapi.off("call-end", onCallEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("message", onMessageUpdate);
      vapi.off("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to handle SSE connection based on callId
  useEffect(() => {
    if (!callId) return;

    console.log(`Connecting to SSE for callId: ${callId}`);
    const eventSource = new EventSource(`/api/rt/subscribe?callId=${callId}`);

    eventSource.onmessage = (event) => {
      // Handle keepalive messages
      if (event.data.startsWith("keepalive")) return;

      try {
        const parsed = JSON.parse(event.data);
        console.log("SSE event received", parsed);
        setEvents((prev) => [...prev, parsed]);
      } catch (e) {
        console.error("Failed to parse SSE event", e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource error:", err);
      eventSource.close();
    };

    // Cleanup on component unmount or callId change
    return () => {
      console.log(`Closing SSE for callId: ${callId}`);
      eventSource.close();
    };
  }, [callId]);

  const start = async () => {
    setCallStatus(CALL_STATUS.LOADING);
    const response = vapi.start(assistant);

    response.then((res) => {
      console.log("call", res);
      const id = res?.id || res?.sid;
      if (id) {
        setCallId(id);
      }
    });
  };

  const stop = () => {
    setCallStatus(CALL_STATUS.LOADING);
    vapi.stop();
  };

  const toggleCall = () => {
    if (callStatus == CALL_STATUS.ACTIVE) {
      stop();
    } else {
      start();
    }
  };

  return {
    isSpeechActive,
    callStatus,
    audioLevel,
    activeTranscript,
    messages,
    events, // Expose events
    callId, // Expose callId
    start,
    stop,
    toggleCall,
  };
}
