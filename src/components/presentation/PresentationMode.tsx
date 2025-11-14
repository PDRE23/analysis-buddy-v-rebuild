"use client";

/**
 * Presentation Mode Component
 * Main presentation component with slide management
 */

import React, { useState, useEffect, useCallback } from "react";
import { PresentationSlide } from "./PresentationSlide";
import { PresentationControls } from "./PresentationControls";
import { ComparisonSlide } from "./ComparisonSlide";
import type { Proposal, AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { buildAnnualCashflow } from "@/components/LeaseAnalyzerApp";
import {
  generatePresentationSlides,
  generateComparisonSlides,
  type PresentationSlide as SlideData,
} from "@/lib/presentationGenerator";

interface PresentationModeProps {
  proposal: Proposal;
  analysis: AnalysisMeta;
  proposals?: Proposal[]; // For comparison mode
  onClose: () => void;
  presenterNotes?: string;
}

export function PresentationMode({
  proposal,
  analysis,
  proposals = [],
  onClose,
  presenterNotes,
}: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const cashflow = React.useMemo(() => buildAnnualCashflow(proposal.meta), [proposal.meta]);

  // Generate slides
  useEffect(() => {
    const baseSlides = generatePresentationSlides(proposal, analysis, cashflow);
    
    // Add comparison slide if multiple proposals
    if (proposals.length > 1) {
      const comparisonSlides = generateComparisonSlides(proposals, analysis);
      // Insert comparison after financial summary
      const financialIndex = baseSlides.findIndex(s => s.type === "financial-summary");
      if (financialIndex !== -1) {
        baseSlides.splice(financialIndex + 1, 0, ...comparisonSlides);
      } else {
        baseSlides.push(...comparisonSlides);
      }
    }
    
    setSlides(baseSlides);
  }, [proposal, analysis, proposals, cashflow]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
        return;
      }
      
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevious();
        return;
      }
      
      // Toggle presenter notes with 'N'
      if (e.key === "n" || e.key === "N") {
        setShowNotes(prev => !prev);
      }
      
      // Toggle fullscreen with 'F'
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, slides.length]);

  const handleNext = useCallback(() => {
    setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
  }, [slides.length]);

  const handlePrevious = useCallback(() => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading presentation...</p>
        </div>
      </div>
    );
  }

  const currentSlideData = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Slide Content */}
      <div className="w-full h-full overflow-hidden">
        {currentSlideData.type === "comparison" ? (
          <ComparisonSlide
            slide={currentSlideData}
            proposals={proposals}
            analysis={analysis}
          />
        ) : (
          <PresentationSlide
            slide={currentSlideData}
            cashflow={cashflow}
          />
        )}
      </div>
      
      {/* Controls */}
      <PresentationControls
        currentSlide={currentSlide}
        totalSlides={slides.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onClose={onClose}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        showPresenterNotes={showNotes}
        presenterNotes={presenterNotes}
      />
    </div>
  );
}

