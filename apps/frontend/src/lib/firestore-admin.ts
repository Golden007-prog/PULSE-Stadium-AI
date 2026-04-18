import { initializeApp, applicationDefault, getApps, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT ?? "pulse-stadium-ai";

let _db: Firestore | null = null;

export function getDb(): Firestore {
  if (_db) return _db;
  if (getApps().length === 0) {
    initializeApp({
      projectId: PROJECT_ID,
      credential: applicationDefault(),
    });
  }
  _db = getFirestore();
  return _db;
}

// Convert Firestore Timestamp / FieldValue into plain JSON-safe values.
export function toPlain<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) return obj.map(toPlain) as unknown as T;
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    // firebase-admin Timestamp
    if (typeof (o as { toMillis?: unknown }).toMillis === "function") {
      return (o as { toMillis: () => number }).toMillis() as unknown as T;
    }
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o)) out[k] = toPlain(o[k]);
    return out as T;
  }
  return obj as T;
}
