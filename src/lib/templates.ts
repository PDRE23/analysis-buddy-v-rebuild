/**
 * Smart Templates & Scenario Builder
 * Template library and scenario management
 */

import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import { nanoid } from "nanoid";

export type TemplateCategory = 
  | "office"
  | "retail"
  | "industrial"
  | "medical"
  | "warehouse"
  | "custom";

export interface LeaseTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  market?: string;
  template: Partial<AnalysisMeta>;
  tags: string[];
  createdBy?: string;
  createdAt: string;
  usageCount: number;
}

export interface Scenario {
  id: string;
  name: string;
  baseAnalysisId: string;
  modifications: Partial<AnalysisMeta>;
  createdAt: string;
  saved: boolean;
}

const TEMPLATES_STORAGE_KEY = "lease-templates";
const SCENARIOS_STORAGE_KEY = "saved-scenarios";

/**
 * Get all templates
 */
export function getAllTemplates(): LeaseTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultTemplates();
  } catch {
    return getDefaultTemplates();
  }
}

/**
 * Get default templates
 */
function getDefaultTemplates(): LeaseTemplate[] {
  return [
    {
      id: "template-5yr-office-fs",
      name: "5-Year Office Lease - Full Service",
      category: "office",
      description: "Standard 5-year office lease with full service",
      template: {
        lease_type: "FS",
        key_dates: {
          commencement: new Date().toISOString().split("T")[0],
          rent_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          expiration: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        operating: {
          est_op_ex_psf: 8.0,
          escalation_method: "fixed",
          escalation_value: 0.03,
        },
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        rent_schedule: [{
          period_start: new Date().toISOString().split("T")[0],
          period_end: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          rent_psf: 30.0,
          escalation_percentage: 0.03,
        }],
        concessions: {
          abatement_type: "at_commencement",
          abatement_free_rent_months: 0,
          abatement_applies_to: "base_only",
        },
      },
      tags: ["office", "5-year", "full-service"],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: "template-10yr-industrial-nnn",
      name: "10-Year Industrial Lease - Triple Net",
      category: "industrial",
      description: "Standard 10-year industrial lease with triple net",
      template: {
        lease_type: "NNN",
        key_dates: {
          commencement: new Date().toISOString().split("T")[0],
          rent_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          expiration: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        operating: {
          est_op_ex_psf: 3.0,
          escalation_method: "fixed",
          escalation_value: 0.025,
        },
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        rent_schedule: [{
          period_start: new Date().toISOString().split("T")[0],
          period_end: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          rent_psf: 8.0,
          escalation_percentage: 0.025,
        }],
        concessions: {
          abatement_type: "at_commencement",
          abatement_free_rent_months: 0,
          abatement_applies_to: "base_only",
        },
      },
      tags: ["industrial", "10-year", "triple-net"],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: "template-medical-office-base-year",
      name: "Medical Office - FS with Base Year",
      category: "medical",
      description: "Medical office lease with base year",
      template: {
        lease_type: "FS",
        base_year: new Date().getFullYear(),
        key_dates: {
          commencement: new Date().toISOString().split("T")[0],
          rent_start: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          expiration: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        operating: {
          est_op_ex_psf: 12.0,
          escalation_method: "cpi",
          escalation_value: 0.03,
        },
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        rent_schedule: [{
          period_start: new Date().toISOString().split("T")[0],
          period_end: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          rent_psf: 35.0,
          escalation_percentage: 0.03,
        }],
        concessions: {
          ti_allowance_psf: 50.0,
          moving_allowance: 10000,
          abatement_type: "at_commencement",
          abatement_free_rent_months: 3,
          abatement_applies_to: "base_only",
        },
      },
      tags: ["medical", "base-year", "full-service"],
      createdAt: new Date().toISOString(),
      usageCount: 0,
    },
  ];
}

/**
 * Save template
 */
export function saveTemplate(template: Omit<LeaseTemplate, "id" | "createdAt" | "usageCount">): string {
  const templates = getAllTemplates();
  const newTemplate: LeaseTemplate = {
    ...template,
    id: nanoid(),
    createdAt: new Date().toISOString(),
    usageCount: 0,
  };
  
  templates.push(newTemplate);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  
  return newTemplate.id;
}

/**
 * Apply template to analysis
 */
export function applyTemplate(template: LeaseTemplate, analysis: AnalysisMeta): AnalysisMeta {
  // Increment usage count
  const templates = getAllTemplates();
  const updatedTemplates = templates.map(t => 
    t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
  );
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updatedTemplates));

  // Merge template into analysis
  return {
    ...analysis,
    ...template.template,
    // Preserve ID and name
    id: analysis.id,
    name: analysis.name || template.name,
  };
}

/**
 * Get scenarios for an analysis
 */
export function getScenariosForAnalysis(analysisId: string): Scenario[] {
  try {
    const stored = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    const allScenarios = stored ? JSON.parse(stored) : [];
    return allScenarios.filter((s: Scenario) => s.baseAnalysisId === analysisId && s.saved);
  } catch {
    return [];
  }
}

/**
 * Save scenario
 */
export function saveScenario(scenario: Omit<Scenario, "id" | "createdAt">): string {
  const scenarios = getAllScenarios();
  const newScenario: Scenario = {
    ...scenario,
    id: nanoid(),
    createdAt: new Date().toISOString(),
    saved: true,
  };
  
  scenarios.push(newScenario);
  localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
  
  return newScenario.id;
}

/**
 * Get all scenarios
 */
function getAllScenarios(): Scenario[] {
  try {
    const stored = localStorage.getItem(SCENARIOS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Apply scenario modifications to analysis
 */
export function applyScenarioModifications(analysis: AnalysisMeta, modifications: Partial<AnalysisMeta>): AnalysisMeta {
  return {
    ...analysis,
    ...modifications,
    // Preserve ID
    id: analysis.id,
  };
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): LeaseTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Get templates by market
 */
export function getTemplatesByMarket(market: string): LeaseTemplate[] {
  return getAllTemplates().filter(t => 
    t.market && t.market.toLowerCase().includes(market.toLowerCase())
  );
}

