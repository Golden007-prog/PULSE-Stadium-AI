/**
 * PULSE Firestore seeder.
 *
 * Reads packages/simulated-stadium-map/zones.geojson and writes:
 *   /venues/chinnaswamy
 *   /venues/chinnaswamy/zones/{zone_id}
 *
 * Polygons are converted from GeoJSON [lng, lat] order into the project schema
 * ({lat, lng} maps) declared in Idea.md §6.1.
 *
 * Run:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json \
 *   GOOGLE_CLOUD_PROJECT=pulse-stadium-ai \
 *   npx tsx scripts/seed-firestore.ts
 */
import * as admin from "firebase-admin";
import * as fs from "node:fs";
import * as path from "node:path";

type Feature = {
  type: "Feature";
  properties: {
    id: string;
    name: string;
    type: "gate" | "seating" | "concourse" | "concession" | "restroom";
    capacity?: number;
    throughput_per_min?: number;
    stalls?: number;
    tags?: string[];
  };
  geometry: { type: "Polygon"; coordinates: number[][][] };
};
type FeatureCollection = {
  type: "FeatureCollection";
  name: string;
  properties: {
    venue_id: string;
    venue_name: string;
    city: string;
    center: [number, number];
  };
  features: Feature[];
};

const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? "pulse-stadium-ai";
const venueId = process.env.PULSE_VENUE_ID ?? "chinnaswamy";
const geoPath = path.resolve(
  __dirname,
  "..",
  "packages",
  "simulated-stadium-map",
  "zones.geojson",
);

admin.initializeApp({
  projectId,
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

async function seed() {
  const geo = JSON.parse(fs.readFileSync(geoPath, "utf8")) as FeatureCollection;
  console.log(
    `[seed] project=${projectId} venue=${venueId} zones=${geo.features.length}`,
  );

  const venueRef = db.collection("venues").doc(venueId);

  const zonesSummary = geo.features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    type: f.properties.type,
    capacity: f.properties.capacity ?? 0,
  }));

  await venueRef.set(
    {
      name: geo.properties.venue_name,
      city: geo.properties.city,
      capacity: 40000,
      center_lng: geo.properties.center[0],
      center_lat: geo.properties.center[1],
      zones: zonesSummary,
      source: "packages/simulated-stadium-map/zones.geojson",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`[seed] venue doc written: venues/${venueId}`);

  const batch = db.batch();
  for (const f of geo.features) {
    const ring = f.geometry.coordinates[0];
    const polygon = ring.map(([lng, lat]) => ({ lat, lng }));
    const zRef = venueRef.collection("zones").doc(f.properties.id);
    batch.set(
      zRef,
      {
        name: f.properties.name,
        type: f.properties.type,
        capacity: f.properties.capacity ?? 0,
        throughput_per_min: f.properties.throughput_per_min ?? null,
        stalls: f.properties.stalls ?? null,
        tags: f.properties.tags ?? [],
        polygon,
        current_density: 0,
        predicted_density_5m: 0,
        predicted_density_15m: 0,
        last_updated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  await batch.commit();
  console.log(`[seed] ${geo.features.length} zone docs written`);
  console.log("[seed] done");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] FAILED", err);
    process.exit(1);
  });
