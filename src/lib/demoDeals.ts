/**
 * Demo Deal Data for Testing
 */

import { nanoid } from "nanoid";
import type { Deal, DealStage } from "./types/deal";

export function createDemoDeals(): Deal[] {
  const now = new Date().toISOString();
  const futureDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString();
  };

  return [
    // Lead Stage
    {
      id: nanoid(),
      clientName: "Acme Corporation",
      clientCompany: "Acme Corp",
      property: {
        address: "123 Main Street",
        city: "Miami",
        state: "FL",
        zipCode: "33101",
        building: "Tower A",
        floor: "15",
        suite: "1500",
      },
      stage: "Lead" as DealStage,
      priority: "High",
      rsf: 15000,
      leaseTerm: 60,
      expectedCloseDate: futureDate(3),
      estimatedValue: 250000,
      broker: "John Smith",
      brokerEmail: "john.smith@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Initial contact made with decision maker",
        },
      ],
      tags: ["New Business", "Tech Company"],
      notes: "Promising lead, looking for modern office space",
      createdAt: now,
      updatedAt: now,
    },

    // Touring Stage
    {
      id: nanoid(),
      clientName: "Tech Innovations LLC",
      clientCompany: "Tech Innovations",
      property: {
        address: "456 Innovation Drive",
        city: "Boca Raton",
        state: "FL",
        zipCode: "33431",
      },
      stage: "Touring" as DealStage,
      priority: "Medium",
      rsf: 25000,
      leaseTerm: 84,
      expectedCloseDate: futureDate(2),
      estimatedValue: 420000,
      broker: "Sarah Johnson",
      brokerEmail: "sarah.johnson@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Scheduled property tour for next week",
        },
      ],
      tags: ["Expansion", "Fast Growing"],
      createdAt: now,
      updatedAt: now,
    },

    // Proposal Stage
    {
      id: nanoid(),
      clientName: "Global Finance Group",
      clientCompany: "Global Finance",
      property: {
        address: "789 Financial Plaza",
        city: "Fort Lauderdale",
        state: "FL",
        zipCode: "33301",
        building: "South Tower",
        floor: "20",
      },
      stage: "Proposal" as DealStage,
      priority: "High",
      rsf: 35000,
      leaseTerm: 120,
      expectedCloseDate: futureDate(4),
      estimatedValue: 650000,
      broker: "Mike Chen",
      brokerEmail: "mike.chen@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Submitted initial proposal with competitive terms",
        },
      ],
      tags: ["Financial Services", "High Value"],
      confidenceLevel: 70,
      createdAt: now,
      updatedAt: now,
    },

    // Proposal Stage (changed from Negotiation)
    {
      id: nanoid(),
      clientName: "Healthcare Partners",
      clientCompany: "Healthcare Partners Inc",
      property: {
        address: "321 Medical Center Blvd",
        city: "West Palm Beach",
        state: "FL",
        zipCode: "33401",
      },
      stage: "Proposal" as DealStage,
      priority: "High",
      rsf: 20000,
      leaseTerm: 60,
      expectedCloseDate: futureDate(1),
      estimatedValue: 380000,
      broker: "Emily Rodriguez",
      brokerEmail: "emily.rodriguez@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Deal moved to Proposal",
        },
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Counter-proposal received, reviewing terms",
        },
      ],
      tags: ["Healthcare", "Quick Close"],
      confidenceLevel: 85,
      notes: "Very interested, just working through final lease terms",
      createdAt: now,
      updatedAt: now,
    },

    // Lease Execution Stage
    {
      id: nanoid(),
      clientName: "Retail Ventures",
      clientCompany: "Retail Ventures Co",
      property: {
        address: "555 Shopping District",
        city: "Miami Beach",
        state: "FL",
        zipCode: "33139",
      },
      stage: "Lease Execution" as DealStage,
      priority: "Medium",
      rsf: 12000,
      leaseTerm: 36,
      expectedCloseDate: futureDate(1),
      estimatedValue: 180000,
      broker: "David Lee",
      brokerEmail: "david.lee@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Moving to lease execution",
        },
      ],
      tags: ["Retail", "Short Term"],
      confidenceLevel: 90,
      createdAt: now,
      updatedAt: now,
    },

    // Lease Execution Stage
    {
      id: nanoid(),
      clientName: "Manufacturing Solutions",
      clientCompany: "Manufacturing Solutions Inc",
      property: {
        address: "888 Industrial Way",
        city: "Deerfield Beach",
        state: "FL",
        zipCode: "33441",
      },
      stage: "Lease Execution" as DealStage,
      priority: "High",
      rsf: 40000,
      leaseTerm: 96,
      expectedCloseDate: futureDate(0.5),
      estimatedValue: 720000,
      broker: "Amanda Wilson",
      brokerEmail: "amanda.wilson@example.com",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Final lease documents under review",
        },
      ],
      tags: ["Manufacturing", "Large Deal"],
      confidenceLevel: 95,
      notes: "Legal teams reviewing final documents, expecting to close this week",
      createdAt: now,
      updatedAt: now,
    },

    // A few more at various stages
    {
      id: nanoid(),
      clientName: "Creative Agency",
      property: {
        address: "222 Design District",
        city: "Miami",
        state: "FL",
      },
      stage: "Lead" as DealStage,
      priority: "Low",
      rsf: 8000,
      leaseTerm: 36,
      broker: "John Smith",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Initial inquiry received",
        },
      ],
      tags: ["Creative"],
      createdAt: now,
      updatedAt: now,
    },

    {
      id: nanoid(),
      clientName: "Law Firm Associates",
      clientCompany: "Law Firm Associates LLP",
      property: {
        address: "999 Justice Avenue",
        city: "Fort Lauderdale",
        state: "FL",
      },
      stage: "Touring" as DealStage,
      priority: "Medium",
      rsf: 18000,
      leaseTerm: 84,
      estimatedValue: 450000,
      broker: "Sarah Johnson",
      status: "Active",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: "Tour completed, very positive feedback",
        },
      ],
      tags: ["Legal", "Professional Services"],
      confidenceLevel: 75,
      createdAt: now,
      updatedAt: now,
    },

    // Closed Won
    {
      id: nanoid(),
      clientName: "Tech Startup Inc",
      clientCompany: "Tech Startup",
      property: {
        address: "1234 Innovation Blvd",
        city: "Miami",
        state: "FL",
        zipCode: "33132",
      },
      stage: "Closed Won" as DealStage,
      priority: "High",
      rsf: 22000,
      leaseTerm: 60,
      estimatedValue: 500000,
      broker: "John Smith",
      status: "Won",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Deal closed successfully!",
        },
      ],
      tags: ["Technology", "Expansion"],
      confidenceLevel: 100,
      notes: "Successfully closed - lease signed and executed",
      createdAt: now,
      updatedAt: now,
    },

    // Closed Won
    {
      id: nanoid(),
      clientName: "Consulting Group LLC",
      clientCompany: "Consulting Group",
      property: {
        address: "567 Business Park",
        city: "Boca Raton",
        state: "FL",
      },
      stage: "Closed Won" as DealStage,
      priority: "Medium",
      rsf: 15000,
      leaseTerm: 72,
      estimatedValue: 380000,
      broker: "Emily Rodriguez",
      status: "Won",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Lease executed - deal won!",
        },
      ],
      tags: ["Consulting", "New Business"],
      confidenceLevel: 100,
      createdAt: now,
      updatedAt: now,
    },

    // Closed Lost
    {
      id: nanoid(),
      clientName: "E-commerce Company",
      property: {
        address: "888 Commerce Drive",
        city: "Miami",
        state: "FL",
      },
      stage: "Closed Lost" as DealStage,
      priority: "Low",
      rsf: 10000,
      leaseTerm: 36,
      broker: "Mike Chen",
      status: "Dead",
      lostReason: "Decided to renew at current location",
      analysisIds: [],
      activities: [
        {
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: "Deal lost - tenant renewed at current space",
        },
      ],
      tags: ["E-commerce"],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// Helper to check if deals exist, and create demo deals if not
export function ensureDemoDeals(existingDeals: Deal[]): Deal[] {
  if (existingDeals.length === 0) {
    console.log("🔧 No deals found, creating demo deals");
    return createDemoDeals();
  }
  return existingDeals;
}

