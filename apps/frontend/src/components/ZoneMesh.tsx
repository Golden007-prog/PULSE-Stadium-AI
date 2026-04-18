"use client";
import * as THREE from "three";
import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { projectLatLng } from "@/lib/geo";
import { densityColor, densityLabel } from "@/lib/colors";
import type { Zone } from "@/lib/types";

export function ZoneMesh({ zone }: { zone: Zone }) {
  const [hover, setHover] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, height, centroid, color } = useMemo(() => {
    const pts = (zone.polygon ?? []).map((p) => projectLatLng(p.lat, p.lng));
    const shape = new THREE.Shape();
    if (pts.length > 0) shape.moveTo(pts[0].x, pts[0].z);
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i].x, pts[i].z);

    const density = zone.current_density ?? 0;
    const height = Math.max(1.2, Math.min(22, 1.2 + density * 3.2));
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geom.rotateX(-Math.PI / 2);
    // Center of mass for label positioning
    let cx = 0;
    let cz = 0;
    for (const p of pts) {
      cx += p.x;
      cz += p.z;
    }
    const n = Math.max(1, pts.length);
    return {
      geometry: geom,
      height,
      centroid: { x: cx / n, z: cz / n },
      color: densityColor(density),
    };
  }, [zone]);

  // Pulse emissive on high density
  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const mat = m.material as THREE.MeshStandardMaterial;
    const d = zone.current_density ?? 0;
    if (d >= 4.0) {
      const t = state.clock.elapsedTime;
      mat.emissiveIntensity = 0.45 + 0.3 * Math.sin(t * 3.0);
    } else {
      mat.emissiveIntensity = d >= 3.5 ? 0.32 : 0.15;
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          metalness={0.05}
          roughness={0.55}
          transparent
          opacity={zone.type === "seating" ? 0.78 : 0.92}
        />
      </mesh>
      {(hover || (zone.current_density ?? 0) >= 4.0) && (
        <Html
          position={[centroid.x, height + 3, centroid.z]}
          center
          occlude={false}
          distanceFactor={170}
        >
          <div className="bg-surface/90 backdrop-blur px-2 py-1 whitespace-nowrap pointer-events-none"
               style={{ borderLeft: `2px solid ${color}` }}>
            <div className="mono text-[10px] uppercase tracking-wider text-accent-cyan">
              {zone.id}
            </div>
            <div className="text-[11px] text-ink">{zone.name}</div>
            <div className="mono text-[10px] text-ink-fade">
              {(zone.current_density ?? 0).toFixed(2)} p/m² · {densityLabel(zone.current_density ?? 0)}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
