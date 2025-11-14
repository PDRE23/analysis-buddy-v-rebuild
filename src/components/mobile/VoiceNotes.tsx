"use client";

/**
 * Voice Notes Component
 * Record voice notes for mobile devices
 */

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Square, Play, Pause, Trash2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceNotesProps {
  onSave?: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // seconds
}

export function VoiceNotes({
  onSave,
  onCancel,
  maxDuration = 300, // 5 minutes default
}: VoiceNotesProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Update duration
      intervalRef.current = window.setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Microphone access denied. Please enable microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      intervalRef.current = window.setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleDelete = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setDuration(0);
  };

  const handleSave = () => {
    if (audioBlob && onSave) {
      onSave(audioBlob, duration);
    }
  };

  const handlePlay = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Voice Note</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Duration Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-primary mb-2">
            {formatDuration(duration)}
          </div>
          {duration >= maxDuration && (
            <div className="text-sm text-muted-foreground">
              Maximum duration reached
            </div>
          )}
        </div>

        {/* Recording Controls */}
        {!audioBlob && (
          <div className="flex items-center justify-center gap-4">
            {isRecording ? (
              <>
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                  className="rounded-full h-16 w-16"
                >
                  {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                </Button>
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-20 w-20"
                >
                  <Square className="h-8 w-8" />
                </Button>
              </>
            ) : (
              <Button
                onClick={startRecording}
                size="lg"
                className="rounded-full h-20 w-20 bg-primary"
              >
                <Mic className="h-8 w-8" />
              </Button>
            )}
          </div>
        )}

        {/* Playback Controls */}
        {audioBlob && (
          <div className="space-y-4">
            <audio
              ref={audioRef}
              src={audioUrl || undefined}
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
            />
            
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handlePlay}
                variant="outline"
                size="lg"
                className="rounded-full h-16 w-16"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                size="lg"
                className="rounded-full h-16 w-16"
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} className="flex-1 rounded-2xl" disabled={!audioBlob}>
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </Button>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-red-600">
              <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
              Recording...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

