"use client";

/**
 * Note Templates Component
 * Pre-defined templates for common note types
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Building2, TrendingUp, MapPin } from "lucide-react";
import type { TeamNote, TeamNoteCategory } from "@/lib/types/teamNotes";

export interface NoteTemplate {
  id: string;
  name: string;
  category: TeamNoteCategory;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  tags: string[];
}

const templates: NoteTemplate[] = [
  {
    id: "client-meeting",
    name: "Client Meeting Notes",
    category: "meeting_notes",
    icon: Users,
    content: `# Client Meeting - [Client Name]

**Date:** [Date]
**Attendees:** [Names]

## Discussion Points
- 
- 
- 

## Action Items
- [ ] 
- [ ] 

## Next Steps
- 

## Notes
`,
    tags: ["meeting", "client"],
  },
  {
    id: "property-tour",
    name: "Property Tour Notes",
    category: "property",
    icon: Building2,
    content: `# Property Tour - [Property Name]

**Date:** [Date]
**Address:** [Address]
**RSF:** [Square Feet]

## Property Details
- Building Class: 
- Year Built: 
- Parking: 
- Amenities: 

## Observations
- 
- 
- 

## Client Feedback
- 

## Recommendation
`,
    tags: ["property", "tour"],
  },
  {
    id: "market-research",
    name: "Market Research",
    category: "market_info",
    icon: TrendingUp,
    content: `# Market Research - [Market]

**Date:** [Date]
**Market:** [Market Name]

## Market Overview
- Average Rent: 
- Vacancy Rate: 
- Absorption: 

## Key Findings
- 
- 
- 

## Comparable Properties
1. 
2. 
3. 

## Sources
- 
`,
    tags: ["market", "research"],
  },
  {
    id: "competitor-analysis",
    name: "Competitor Analysis",
    category: "client_intel",
    icon: FileText,
    content: `# Competitor Analysis - [Competitor/Property]

**Date:** [Date]

## Overview
- Property: 
- Location: 
- RSF: 

## Pricing
- Rent Rate: 
- Concessions: 
- Terms: 

## Strengths
- 
- 

## Weaknesses
- 
- 

## Competitive Position
`,
    tags: ["competitor", "analysis"],
  },
  {
    id: "location-notes",
    name: "Location Notes",
    category: "property",
    icon: MapPin,
    content: `# Location Notes - [Location]

**Date:** [Date]
**Address:** [Address]

## Location Highlights
- Proximity to: 
- Transportation: 
- Demographics: 

## Area Analysis
- 
- 
- 

## Considerations
- 
`,
    tags: ["location", "property"],
  },
];

interface NoteTemplatesProps {
  onSelectTemplate: (template: NoteTemplate) => void;
  className?: string;
}

export function NoteTemplates({ onSelectTemplate, className }: NoteTemplatesProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-3">Note Templates</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className="rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {template.content.split("\n").slice(0, 2).join(" ")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Apply template to a note
 */
export function applyTemplateToNote(
  template: NoteTemplate,
  noteId: string,
  author: string
): Partial<TeamNote> {
  return {
    title: template.name.replace(/\[.*?\]/g, "").trim(),
    content: template.content,
    category: template.category,
    tags: template.tags,
  };
}

