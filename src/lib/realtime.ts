/**
 * Real-Time Collaboration
 * WebSocket/real-time logic for live collaboration
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";

export type CollaborationEvent = 
  | "cursor_move"
  | "selection_change"
  | "content_change"
  | "presence_update"
  | "user_joined"
  | "user_left";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
    element?: string;
  };
  selection?: {
    start: number;
    end: number;
  };
  lastSeen: string;
}

export interface CollaborationEventData {
  type: CollaborationEvent;
  userId: string;
  resourceId: string; // deal ID or analysis ID
  resourceType: "deal" | "analysis" | "note";
  timestamp: string;
  data: unknown;
}

export interface PresenceState {
  resourceId: string;
  resourceType: "deal" | "analysis" | "note";
  collaborators: Collaborator[];
}

// In-memory collaboration state (would be replaced with WebSocket in production)
const collaborationState = new Map<string, PresenceState>();
const userSessions = new Map<string, Collaborator>();

/**
 * Generate a unique color for a user
 */
function generateUserColor(userId: string): string {
  const colors = [
    "#2563eb", // blue
    "#10b981", // green
    "#f59e0b", // orange
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];
  
  // Consistent color per user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Initialize collaboration for a user
 */
export function initializeCollaboration(
  userId: string,
  userName: string,
  userEmail: string,
  avatar?: string
): Collaborator {
  const collaborator: Collaborator = {
    id: userId,
    name: userName,
    email: userEmail,
    avatar,
    color: generateUserColor(userId),
    lastSeen: new Date().toISOString(),
  };

  userSessions.set(userId, collaborator);
  return collaborator;
}

/**
 * Join a resource (deal, analysis, or note)
 */
export function joinResource(
  userId: string,
  resourceId: string,
  resourceType: "deal" | "analysis" | "note"
): void {
  const key = `${resourceType}:${resourceId}`;
  const collaborator = userSessions.get(userId);
  
  if (!collaborator) {
    console.warn(`User ${userId} not initialized`);
    return;
  }

  let state = collaborationState.get(key);
  if (!state) {
    state = {
      resourceId,
      resourceType,
      collaborators: [],
    };
    collaborationState.set(key, state);
  }

  // Check if user is already in the list
  const existingIndex = state.collaborators.findIndex(c => c.id === userId);
  if (existingIndex === -1) {
    state.collaborators.push({ ...collaborator });
    collaborationState.set(key, state);
    
    // Broadcast user joined event
    broadcastEvent({
      type: "user_joined",
      userId,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
      data: { collaborator },
    });
  }
}

/**
 * Leave a resource
 */
export function leaveResource(
  userId: string,
  resourceId: string,
  resourceType: "deal" | "analysis" | "note"
): void {
  const key = `${resourceType}:${resourceId}`;
  const state = collaborationState.get(key);
  
  if (state) {
    state.collaborators = state.collaborators.filter(c => c.id !== userId);
    
    if (state.collaborators.length === 0) {
      collaborationState.delete(key);
    } else {
      collaborationState.set(key, state);
    }

    // Broadcast user left event
    broadcastEvent({
      type: "user_left",
      userId,
      resourceId,
      resourceType,
      timestamp: new Date().toISOString(),
      data: {},
    });
  }
}

/**
 * Update cursor position
 */
export function updateCursor(
  userId: string,
  resourceId: string,
  resourceType: "deal" | "analysis" | "note",
  x: number,
  y: number,
  element?: string
): void {
  const key = `${resourceType}:${resourceId}`;
  const state = collaborationState.get(key);
  
  if (state) {
    const collaborator = state.collaborators.find(c => c.id === userId);
    if (collaborator) {
      collaborator.cursor = { x, y, element };
      collaborator.lastSeen = new Date().toISOString();
      collaborationState.set(key, state);

      broadcastEvent({
        type: "cursor_move",
        userId,
        resourceId,
        resourceType,
        timestamp: new Date().toISOString(),
        data: { x, y, element },
      });
    }
  }
}

/**
 * Update selection
 */
export function updateSelection(
  userId: string,
  resourceId: string,
  resourceType: "deal" | "analysis" | "note",
  start: number,
  end: number
): void {
  const key = `${resourceType}:${resourceId}`;
  const state = collaborationState.get(key);
  
  if (state) {
    const collaborator = state.collaborators.find(c => c.id === userId);
    if (collaborator) {
      collaborator.selection = { start, end };
      collaborator.lastSeen = new Date().toISOString();
      collaborationState.set(key, state);

      broadcastEvent({
        type: "selection_change",
        userId,
        resourceId,
        resourceType,
        timestamp: new Date().toISOString(),
        data: { start, end },
      });
    }
  }
}

/**
 * Get presence state for a resource
 */
export function getPresenceState(
  resourceId: string,
  resourceType: "deal" | "analysis" | "note"
): PresenceState | null {
  const key = `${resourceType}:${resourceId}`;
  return collaborationState.get(key) || null;
}

/**
 * Get all collaborators for a resource
 */
export function getCollaborators(
  resourceId: string,
  resourceType: "deal" | "analysis" | "note"
): Collaborator[] {
  const state = getPresenceState(resourceId, resourceType);
  return state?.collaborators || [];
}

/**
 * Broadcast event (in production, this would send via WebSocket)
 */
const eventListeners = new Set<(event: CollaborationEventData) => void>();

export function subscribeToEvents(listener: (event: CollaborationEventData) => void): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

function broadcastEvent(event: CollaborationEventData): void {
  eventListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error("Error in collaboration event listener:", error);
    }
  });
}

/**
 * Simulate WebSocket connection (for development)
 */
export function simulateConnection(): {
  disconnect: () => void;
} {
  // In production, this would establish a WebSocket connection
  // For now, we'll use a polling mechanism to simulate real-time updates
  
  const interval = setInterval(() => {
    // Periodically check for presence updates
    collaborationState.forEach((state, key) => {
      const now = Date.now();
      state.collaborators.forEach(collaborator => {
        const lastSeen = new Date(collaborator.lastSeen).getTime();
        // If user hasn't been active in 30 seconds, consider them inactive
        if (now - lastSeen > 30000) {
          // Remove inactive collaborators
          state.collaborators = state.collaborators.filter(c => c.id !== collaborator.id);
        }
      });
      
      if (state.collaborators.length === 0) {
        collaborationState.delete(key);
      }
    });
  }, 5000);

  return {
    disconnect: () => {
      clearInterval(interval);
    },
  };
}

