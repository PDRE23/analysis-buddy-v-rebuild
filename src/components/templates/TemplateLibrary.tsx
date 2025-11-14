"use client";

/**
 * Template Library Component
 * Browse and select templates
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, FileText, Building2, ShoppingBag, Factory, Stethoscope, Package, Star } from "lucide-react";
import {
  getAllTemplates,
  getTemplatesByCategory,
  type TemplateCategory,
  type LeaseTemplate,
  applyTemplate,
} from "@/lib/templates";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";

interface TemplateLibraryProps {
  onSelectTemplate: (template: LeaseTemplate) => void;
  currentAnalysis?: AnalysisMeta;
}

const categoryIcons: Record<TemplateCategory, React.ComponentType<{ className?: string }>> = {
  office: Building2,
  retail: ShoppingBag,
  industrial: Factory,
  medical: Stethoscope,
  warehouse: Package,
  custom: FileText,
};

const categoryLabels: Record<TemplateCategory, string> = {
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  medical: "Medical",
  warehouse: "Warehouse",
  custom: "Custom",
};

export function TemplateLibrary({ onSelectTemplate, currentAnalysis }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");

  const allTemplates = getAllTemplates();
  
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = getTemplatesByCategory(selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory, allTemplates]);

  const categories: TemplateCategory[] = ["office", "retail", "industrial", "medical", "warehouse", "custom"];

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1 flex-wrap">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            {categories.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {categoryLabels[category]}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No templates found</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const Icon = categoryIcons[template.category];
            return (
              <Card key={template.id} className="rounded-2xl hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    {template.usageCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        {template.usageCount}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {template.market && (
                    <p className="text-xs text-muted-foreground">Market: {template.market}</p>
                  )}
                  <Button
                    className="w-full rounded-2xl"
                    onClick={() => onSelectTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

