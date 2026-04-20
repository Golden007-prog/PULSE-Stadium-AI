"use client";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { ZoneMesh } from "./ZoneMesh";
import type { Zone } from "@/lib/types";

export type TwinVariant = "reality" | "counterfactual";

/** React-Three-Fiber 3D digital twin of Chinnaswamy stadium with per-zone density shading. */
export default function Twin3D({
  zones,
  variant = "reality",
  autoRotate = true,
}: {
  zones: Zone[];
  variant?: TwinVariant;
  autoRotate?: boolean;
}) {
  const isCf = variant === "counterfactual";
  return (
    <Canvas
      dpr={[1, 2]}
      shadows={false}
      camera={{ position: [30, 180, 230], fov: 36 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[isCf ? "#0D0A18" : "#0A0D14"]} />
      <fog
        attach="fog"
        args={[isCf ? "#0D0A18" : "#0A0D14", 400, 900]}
      />

      <ambientLight intensity={isCf ? 0.5 : 0.55} />
      <directionalLight
        position={[120, 220, 80]}
        intensity={isCf ? 0.65 : 0.85}
        color={isCf ? "#C8BAFF" : "#E1E2EC"}
      />
      <directionalLight
        position={[-80, 140, -120]}
        intensity={isCf ? 0.35 : 0.25}
        color={isCf ? "#9B6CFF" : "#00E5FF"}
      />

      {/* Pitch (stylised ellipse) */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <mesh>
          <ringGeometry args={[0, 52, 48]} />
          <meshBasicMaterial color={isCf ? "#120c1e" : "#0f1d14"} />
        </mesh>
        <mesh>
          <ringGeometry args={[48, 52, 48]} />
          <meshBasicMaterial color={isCf ? "#2a1f44" : "#1a3a22"} />
        </mesh>
      </group>

      {/* Ground grid */}
      <gridHelper
        args={[
          460,
          23,
          isCf ? "#2a1f44" : "#1A1F2B",
          isCf ? "#1a1333" : "#12161F",
        ]}
        position={[0, 0, 0]}
      />

      <Suspense
        fallback={
          <Html center>
            <span className="mono text-[11px] text-ink-fade">loading twin…</span>
          </Html>
        }
      >
        {zones.map((z) => (
          <ZoneMesh key={z.id} zone={z} variant={variant} />
        ))}
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={160}
        maxDistance={420}
        maxPolarAngle={Math.PI / 2 - 0.12}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
