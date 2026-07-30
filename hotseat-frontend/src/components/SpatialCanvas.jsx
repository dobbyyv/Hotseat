import { useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, Html, Environment, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Particles — 25 slowly rotating spheres scattered in the void
 * to provide parallax reference and deep spatial depth.
 */
function Particles() {
  const meshRef = useRef(null)

  // Precompute random positions once
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, () => ({
      position: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 14,
        -5 - Math.random() * 10,   // Z between -5 and -15
      ],
      scale: 0.02 + Math.random() * 0.04,
    }))
  }, [])

  return (
    <group ref={meshRef} rotation={[0, 0, 0]}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position} scale={p.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color="#a5b4fc"
            emissive="#3b0764"
            emissiveIntensity={0.3}
            roughness={0.6}
            metalness={0.1}
            opacity={0.5}
            transparent
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * GlassIsland — a physical 3D slab of dark frosted glass floating in space.
 * The UI is anchored directly to its surface via Drei's Html component.
 * Float creates organic, weightless hover movement.
 */
function GlassIsland({ children }) {
  return (
    <Float
      speed={2}
      rotationIntensity={0.15}
      floatIntensity={0.4}
      floatingRange={[0, 0.2]}
    >
      {/* 3D glass mesh */}
      <RoundedBox args={[3, 5.2, 0.1]} radius={0.12} smoothness={4}>
        <meshPhysicalMaterial
          transmission={1}
          roughness={0.15}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
          ior={1.5}
          color="#101015"
          specularIntensity={1}
          specularColor="#ffffff"
          envMapIntensity={1.2}
          metalness={0.05}
        />
      </RoundedBox>

      {/* UI anchored to the front face of the glass slab */}
      <Html
        transform
        position={[0, 0, 0.06]}
        distanceFactor={3}
        occlude={false}
        style={{ pointerEvents: 'auto', userSelect: 'auto' }}
      >
        <div
          className="w-[320px] sm:w-[380px] p-6 rounded-2xl"
          style={{ background: 'transparent' }}
        >
          {children}
        </div>
      </Html>
    </Float>
  )
}

/**
 * SpatialScene — camera + HDRI environment + particle void + glass island.
 */
function SpatialScene({ children }) {
  return (
    <>
      {/* Perspective Camera */}
      <perspectiveCamera
        args={[50, undefined, 0.1, 1000]}
        position={[0, 0, 8]}
        makeDefault
      />

      {/* HDRI environment for realistic glass reflections */}
      <Environment files="/hdri/night.hdr" />

      {/* Ambient fill light */}
      <ambientLight intensity={0.3} />

      {/* Subtle directional accent */}
      <directionalLight
        position={[-3, 4, 5]}
        intensity={0.6}
        color="#c4b5fd"
      />

      {/* Background particle field for depth parallax */}
      <Particles />

      {/* The glass island with the UI */}
      <GlassIsland>
        {children}
      </GlassIsland>
    </>
  )
}

/**
 * SpatialCanvas — WebGL-first spatial experience.
 * Renders a 3D glass slab floating in a deep particle void with HDRI lighting.
 * Route content is anchored to the glass surface via Drei's Html.
 */
export default function SpatialCanvas({ children }) {
  return (
    <>
      {/* Full-screen WebGL layer — purely visual background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          style={{ background: '#020204' }}
          dpr={[1, 1.5]}
        >
          <SpatialScene>
            {/* This children prop is what App.jsx passes in (the Routes) */}
            {children}
          </SpatialScene>
        </Canvas>
      </div>
    </>
  )
}