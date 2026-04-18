import { NextResponse } from "next/server";
import { getDb, toPlain } from "@/lib/firestore-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const VENUE_ID = process.env.PULSE_VENUE_ID ?? "chinnaswamy";

export async function GET() {
  const db = getDb();
  const venueRef = db.collection("venues").doc(VENUE_ID);

  const [venueSnap, zonesSnap, interventionsSnap] = await Promise.all([
    venueRef.get(),
    venueRef.collection("zones").get(),
    venueRef
      .collection("interventions")
      .orderBy("created_at", "desc")
      .limit(20)
      .get(),
  ]);

  const venue = toPlain(venueSnap.data() ?? null);
  const zones = zonesSnap.docs.map((d) => ({
    id: d.id,
    ...(toPlain(d.data()) as object),
  }));
  const interventions = interventionsSnap.docs.map((d) => ({
    id: d.id,
    ...(toPlain(d.data()) as object),
  }));

  return NextResponse.json({ venue, zones, interventions });
}
