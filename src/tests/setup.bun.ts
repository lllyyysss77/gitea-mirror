/**
 * Bun test setup file
 * This file is automatically loaded before running tests
 */

import { mock } from "bun:test";

// Set NODE_ENV to test
process.env.NODE_ENV = "test";

// Mock the database module to prevent real database access during tests
mock.module("@/lib/db", () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([])
        })
      })
    }),
    insert: () => ({
      values: () => Promise.resolve()
    }),
    update: () => ({
      set: () => ({
        where: () => Promise.resolve()
      })
    }),
    delete: () => ({
      where: () => Promise.resolve()
    })
  };

  return {
    db: mockDb,
    users: {},
    events: {},
    configs: {},
    repositories: {},
    mirrorJobs: {},
    organizations: {},
    sessions: {},
    accounts: {},
    verificationTokens: {},
    oauthApplications: {},
    oauthAccessTokens: {},
    oauthConsent: {},
    ssoProviders: {}
  };
});

// Mock drizzle-orm to prevent database migrations from running
mock.module("drizzle-orm/bun-sqlite/migrator", () => {
  return {
    migrate: () => {}
  };
});

// Mock config encryption utilities
mock.module("@/lib/utils/config-encryption", () => {
  return {
    decryptConfigTokens: (config: any) => {
      // Return the config as-is for tests
      return config;
    },
    encryptConfigTokens: (config: any) => {
      // Return the config as-is for tests
      return config;
    }
  };
});

// Add DOM testing support if needed
// import { DOMParser } from "linkedom";
// global.DOMParser = DOMParser;
