/**
 * @file Server configuration management
 * @module server/config
 *
 * @remarks
 * This module manages server configuration including environment variables
 * and basic server settings.
 *
 * Optional environment variables:
 * - PORT: Server port (default: 3000)
 * - JWT_SECRET: Secret key for any future auth needs
 */

import dotenv from "dotenv";
dotenv.config();

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** Server port number */
  PORT: string;
  /** Secret key for future use */
  JWT_SECRET: string;
}

/**
 * Server configuration object
 */
export const CONFIG: ServerConfig = {
  PORT: process.env.PORT || "3000",
  JWT_SECRET: process.env.JWT_SECRET || "default-secret-change-in-production",
} as const;