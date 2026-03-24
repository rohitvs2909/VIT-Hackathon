import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

function Room({ image }) {
  const texture = useTexture(image);

  texture.colorSpace = THREE.SRGBColorSpace;

  return (
    <mesh>
      <sphereGeometry args={[50, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

function Loading3D() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black text-white">
      <p className="text-sm tracking-wide">Preparing 3D view...</p>
    </div>
  );
}

export default function Room3DView({ image }) {
  return (
    <div className="w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-black shadow-[0_0_60px_rgba(99,102,241,0.35)]">
      <Canvas
        camera={{ position: [0, 0, 0.1], fov: 75 }}
        style={{ cursor: 'grab' }}
        onPointerDown={(e) => {
          e.currentTarget.style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
      >
        <Suspense fallback={null}>
          <Room image={image} />
        </Suspense>

        <OrbitControls enableZoom enablePan={false} rotateSpeed={0.6} />
      </Canvas>
      {!image && <Loading3D />}
    </div>
  );
}
