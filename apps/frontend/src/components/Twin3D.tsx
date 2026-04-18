"use client";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import { ZoneMesh } from "./ZoneMesh";
import type { Zone } from "@/lib/types";

export default function Twin3D({ zones }: { zones: Zone[] }) {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows={false}
      camera={{ position: [30, 180, 230], fov: 36 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#0A0D14"]} />
      <fog attach="fog" args={["#0A0D14", 400, 900]} />

      <ambientLight intensity={0.55} />
      <directionalLight
        position={[120, 220, 80]}
        intensity={0.85}
        color="#E1E2EC"
      />
      <directionalLight position={[-80, 140, -120]} intensity={0.25} color="#00E5FF" />

      {/* Pitch (stylised ellipse) */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <mesh>
          <ringGeometry args={[0, 52, 48]} />
          <meshBasicMaterial color="#0f1d14" />
        </mesh>
        <mesh>
          <ringGeometry args={[48, 52, 48]} />
          <meshBasicMaterial color="#1a3a22" />
        </mesh>
      </group>

      {/* Ground grid */}
      <gridHelper
        args={[460, 23, "#1A1F2B", "#12161F"]}
        position={[0, 0, 0]}
      />

      <Suspense fallback={<Html center><span className="mono text-[11px] text-ink-fade">loading twin…</span></Html>}>
        {zones.map((z) => (
          <ZoneMesh key={z.id} zone={z} />
        ))}
      </Suspense>

      <OrbitControls
        enablePan={false}
        minDistance={160}
        maxDistance={420}
        maxPolarAngle={Math.PI / 2 - 0.12}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
