"use client";

/**
 * Camera Capture Component
 * Mobile-optimized camera interface for document capture
 */

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Camera, RotateCcw, Check } from "lucide-react";
import {
  capturePhoto,
  getCameraStream,
  stopCameraStream,
  hasCamera,
  type CameraResult,
} from "@/lib/mobileCamera";

interface CameraCaptureProps {
  onCapture: (result: CameraResult) => void;
  onCancel: () => void;
  mode?: "photo" | "document";
}

export function CameraCapture({
  onCapture,
  onCancel,
  mode = "document",
}: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraAvailable, setCameraAvailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    checkCamera();
    return () => {
      if (stream) {
        stopCameraStream(stream);
      }
    };
  }, []);

  const checkCamera = async () => {
    const available = await hasCamera();
    setCameraAvailable(available);
    
    if (available && videoRef.current) {
      const camStream = await getCameraStream(videoRef.current, facingMode);
      setStream(camStream);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          
          onCapture({
            file,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
          });
        }
      }, "image/jpeg", 0.9);
    }
  };

  const handleSwitchCamera = async () => {
    if (stream) {
      stopCameraStream(stream);
    }
    
    const newFacingMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacingMode);
    
    if (videoRef.current) {
      const camStream = await getCameraStream(videoRef.current, newFacingMode);
      setStream(camStream);
    }
  };

  if (!cameraAvailable) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Camera Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Camera access is not available on this device.
          </p>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-white"
        >
          <X className="h-6 w-6" />
        </Button>
        <div className="text-white font-medium">
          {mode === "document" ? "Capture Document" : "Take Photo"}
        </div>
        <Button
          variant="ghost"
          onClick={handleSwitchCamera}
          className="text-white"
        >
          <RotateCcw className="h-6 w-6" />
        </Button>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50">
        <div className="flex items-center justify-center gap-6">
          <Button
            onClick={onCancel}
            variant="outline"
            size="lg"
            className="rounded-full h-16 w-16"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <Button
            onClick={handleCapture}
            size="lg"
            className="rounded-full h-20 w-20 bg-primary"
          >
            <Camera className="h-8 w-8" />
          </Button>
          
          <Button
            onClick={handleSwitchCamera}
            variant="outline"
            size="lg"
            className="rounded-full h-16 w-16"
          >
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

