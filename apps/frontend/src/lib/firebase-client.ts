"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase Web SDK config for pulse-stadium-ai.
 *
 * These values are DELIBERATELY hardcoded — they're the Web SDK
 * config, which Firebase expects to be public. Real security lives
 * in infra/firestore.rules, which only permits reads on the three
 * ops surfaces (venues/**, agent_traces/**, counterfactual/**) and
 * blocks every client-side write.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyADgy1N6-akrO8XPOqaHtkeKWIx8z9wOHo",
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
