/**
 * @file Simple auth store for session management
 * @module server/auth-store
 * 
 * @remarks
 * This module provides a simple store for auth info that can be accessed
 * by handlers that need authentication context.
 */

import type { RedditAuthInfo } from '../types/request-context.js';
// import { logger } from '../utils/logger.js';

// Simple in-memory store for auth info
const authMap = new Map<string, RedditAuthInfo>();

/**
 * Store auth info for a session
 */
export function setAuth(sessionId: string, authInfo: RedditAuthInfo): void {
  authMap.set(sessionId, authInfo);
}

/**
 * Get auth info for a session
 */
export function getAuth(sessionId: string): RedditAuthInfo | undefined {
  return authMap.get(sessionId);
}

/**
 * Remove auth info for a session
 */
export function removeAuth(sessionId: string): void {
  authMap.delete(sessionId);
}

/**
 * Clear all auth info
 */
export function clearAuth(): void {
  authMap.clear();
}

// Export as a module
export const authStore = {
  setAuth,
  getAuth,
  removeAuth,
  clear: clearAuth,
};