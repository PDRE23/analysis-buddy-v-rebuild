/**
 * Sharing - Link generation, validation, and security
 * Secure shareable links for client portal
 */

import { nanoid } from "nanoid";

export interface ShareableLink {
  token: string;
  proposalId: string;
  analysisId: string;
  createdAt: string;
  expiresAt?: string;
  password?: string;
  viewCount: number;
  lastViewedAt?: string;
}

const SHAREABLE_LINKS_KEY = "shareable-links";

/**
 * Generate a secure token for shareable links
 */
function generateToken(): string {
  return nanoid(32); // 32 character secure token
}

/**
 * Create a shareable link
 */
export function createShareableLink(
  proposalId: string,
  analysisId: string,
  options: {
    expiresInDays?: number;
    password?: string;
  } = {}
): ShareableLink {
  const token = generateToken();
  const now = new Date();
  const expiresAt = options.expiresInDays
    ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const link: ShareableLink = {
    token,
    proposalId,
    analysisId,
    createdAt: now.toISOString(),
    expiresAt,
    password: options.password,
    viewCount: 0,
  };

  // Store link
  const links = getShareableLinks();
  links[token] = link;
  saveShareableLinks(links);

  return link;
}

/**
 * Get shareable links from storage
 */
function getShareableLinks(): Record<string, ShareableLink> {
  try {
    const stored = localStorage.getItem(SHAREABLE_LINKS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save shareable links to storage
 */
function saveShareableLinks(links: Record<string, ShareableLink>): void {
  try {
    localStorage.setItem(SHAREABLE_LINKS_KEY, JSON.stringify(links));
  } catch {
    // Ignore errors
  }
}

/**
 * Validate and get shareable link by token
 */
export function getShareableLink(token: string): ShareableLink | null {
  const links = getShareableLinks();
  const link = links[token];

  if (!link) {
    return null;
  }

  // Check expiration
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return null;
  }

  return link;
}

/**
 * Validate password for shareable link
 */
export function validateShareableLinkPassword(
  token: string,
  password: string
): boolean {
  const link = getShareableLink(token);
  if (!link) return false;
  if (!link.password) return true; // No password required
  return link.password === password;
}

/**
 * Record view for shareable link
 */
export function recordShareableView(token: string): void {
  const links = getShareableLinks();
  const link = links[token];

  if (link) {
    link.viewCount++;
    link.lastViewedAt = new Date().toISOString();
    saveShareableLinks(links);
  }
}

/**
 * Get shareable URL
 */
export function getShareableUrl(token: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return `${window.location.origin}/share/${token}`;
}

/**
 * Revoke shareable link
 */
export function revokeShareableLink(token: string): void {
  const links = getShareableLinks();
  delete links[token];
  saveShareableLinks(links);
}

/**
 * Get all shareable links for an analysis
 */
export function getShareableLinksForAnalysis(analysisId: string): ShareableLink[] {
  const links = getShareableLinks();
  return Object.values(links).filter(link => link.analysisId === analysisId);
}

