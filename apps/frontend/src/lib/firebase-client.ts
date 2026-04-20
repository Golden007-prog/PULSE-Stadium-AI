"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase Web SDK config for pulse-stadium-ai.
 *
 * These values are PUBLIC by design, per Firebase's own documentation:
 *   https://firebase.google.com/docs/projects/api-keys
 *
 * A Firebase Web API key identifies the project but does NOT authenticate
 * or authorise access to data. Real security lives in infra/firestore.rules,
 * which is deployed via the firebaserules REST API and:
 *   - permits READS only on /venues/**, /agent_traces/**, /counterfactual/**
 *   - blocks EVERY client-side write
 *
 * Server-side writes go through firebase-admin with the pulse-runtime
 * service-account credentials (see apps/frontend/src/lib/firestore-admin.ts).
 *
 * The allowlist in .gitleaks.toml recognises this key as public-by-design.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyADgy1N6-akrO8XPOqaHtkeKWIx8z9wOHo", // gitleaks:allow — public-by-design Firebase Web API key
  authDomain: "pulse-stadium-ai.firebaseapp.com",
  projectId: "pulse-stadium-ai",
  storageBucket: "pulse-stadium-ai.firebasestorage.app",
  messagingSenderId: "524510164011",
  appId: "1:524510164011:web:3a2a973bf02df862e8266e",
} as const;

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function clientApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return _app;
}

export function clientDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(clientApp());
  return _db;
}
