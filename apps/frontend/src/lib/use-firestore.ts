"use client";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  limit as limitFn,
  onSnapshot,
  orderBy as orderByFn,
  query,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { clientDb } from "./firebase-client";

export interface CollectionOpts {
  orderBy?: [string, "asc" | "desc"];
  limit?: number;
}

/**
 * Live Firestore collection listener. Returns `[]` until the first
 * snapshot arrives; thereafter updates in real time (sub-500ms in
 * practice on asia-south1).
 */
export function useCollection<T>(
  path: string | null,
  opts: CollectionOpts = {}
): { data: T[]; error: Error | null; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const orderField = opts.orderBy?.[0];
  const orderDir = opts.orderBy?.[1];
  const limitVal = opts.limit;

  useEffect(() => {
    if (!path) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    const db = clientDb();
    let q: Query<DocumentData> = collection(db, path);
    if (orderField) q = query(q, orderByFn(orderField, orderDir ?? "asc"));
    if (limitVal) q = query(q, limitFn(limitVal));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as object) } as unknown as T)
          )
        );
        setLoading(false);
      },
      (err) => {
        console.error(`[useCollection:${path}]`, err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [path, orderField, orderDir, limitVal]);

  return { data, error, loading };
}

/**
 * Live Firestore document listener.
 */
export function useDoc<T>(
  path: string | null
): { data: T | null; error: Error | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const db = clientDb();
    const ref = doc(db, path);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(
          snap.exists()
            ? ({ id: snap.id, ...(snap.data() as object) } as unknown as T)
            : null
        );
        setLoading(false);
      },
      (err) => {
        console.error(`[useDoc:${path}]`, err);
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [path]);

  return { data, error, loading };
}
