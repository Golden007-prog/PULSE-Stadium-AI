const CENTER = { lat: 12.9788, lng: 77.5996 };

/**
 * Project (lat, lng) → 2D scene coordinates in metres, centred on the
 * stadium. x = east, z = south (North is -z). 1 scene unit = 1 metre.
 */
export function projectLatLng(lat: number, lng: number): { x: number; z: number } {
  const metersPerDegLat = 111_000;
  const metersPerDegLng = 111_000 * Math.cos((CENTER.lat * Math.PI) / 180);
  const x = (lng - CENTER.lng) * metersPerDegLng;
  const z = -(lat - CENTER.lat) * metersPerDegLat;
  return { x, z };
}

export { CENTER };
