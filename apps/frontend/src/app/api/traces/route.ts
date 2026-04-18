import { NextResponse } from "next/server";
import { getDb, toPlain } from "@/lib/firestore-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const db = getDb();
  const snap = await db
    .collection("agent_traces")
    .orderBy("timestamp", "desc")
    .limit(30)
    .get();
  const traces = snap.docs.map((d) => ({
    id: d.id,
    ...(toPlain(d.data()) as object),
  }));
  return NextResponse.json({ traces });
}
