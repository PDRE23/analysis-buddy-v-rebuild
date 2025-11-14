"use client";

/**
 * Presentation Controls Component
 * Navigation controls (prev/next, slide indicator)
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PresentationControlsProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  showPresenterNotes?: boolean;
  presenterNotes?: string;
}

export function PresentationControls({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onClose,
  onToggleFullscreen,
  isFullscreen,
  showPresenterNotes,
  presenterNotes,
}: PresentationControlsProps) {
  return (
    <>
      {/* Top Controls Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            Slide {currentSlide + 1} of {totalSlides}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={currentSlide === 0}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={currentSlide === totalSlides - 1}
            className="text-white hover:bg-white/20 disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Slide Indicator */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                // Jump to slide - would need callback
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentSlide
                  ? "bg-white w-8"
                  : "bg-white/40 hover:bg-white/60"
              )}
            />
          ))}
        </div>
      </div>
      
      {/* Presenter Notes (if enabled) */}
      {showPresenterNotes && presenterNotes && (
        <div className="fixed bottom-20 left-4 right-4 z-40 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg max-w-2xl">
          <div className="text-xs font-semibold mb-2">Presenter Notes</div>
          <div className="text-sm">{presenterNotes}</div>
        </div>
      )}
    </>
  );
}

