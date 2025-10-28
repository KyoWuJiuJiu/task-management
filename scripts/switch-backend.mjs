#!/usr/bin/env node

/**
 * Quick helper to switch `.env.local` between backend profiles.
 *
 * Usage:
 *   node scripts/switch-backend.mjs local
 *   node scripts/switch-backend.mjs server
 *
 * Customize the endpoint map below if backend URLs change.
 */

import { writeFileSync } from "fs";
import { resolve } from "path";

const PROFILES = {
  local: {
    VITE_TASK_SEND_API: "http://127.0.0.1:8000/api/endpoint",
    VITE_TASK_SYNC_TRIGGER_API: "http://127.0.0.1:8000/api/task-sync",
  },
  server: {
    VITE_TASK_SEND_API: "https://192.168.0.96:9876/api/endpoint",
    VITE_TASK_SYNC_TRIGGER_API: "https://192.168.0.96:9876/api/task-sync",
  },
  prod: {
    VITE_TASK_SEND_API: "https://kyowu.nbparamont.com:16666/api/endpoint",
    VITE_TASK_SYNC_TRIGGER_API: "https://kyowu.nbparamont.com:16666/api/task-sync",
  },
};

const [, , profileArg] = process.argv;
const profile = profileArg ? profileArg.trim().toLowerCase() : "";

if (!profile || !PROFILES[profile]) {
  console.error(
    `Unknown profile "${profileArg ?? ""}". Use one of: ${Object.keys(PROFILES).join(
      ", "
    )}`
  );
  process.exit(1);
}

const envPath = resolve(".env.local");
const entries = PROFILES[profile];

const content =
  Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";

writeFileSync(envPath, content, "utf8");

console.log(`Updated ${envPath} using "${profile}" profile.`);
