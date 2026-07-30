import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Particles — 25 spheres scattered in the void for parallax depth cues.
 * The entire group pans opposite to the mouse, creating perceived depth
 * behind the fixed 2D glass container.
 */
function Particles({ mousePos }) {
  const groupRef = useRef(null)
  const targetRotX = useRef(0)
  const targetRotY = useRef(0)

  // Precompute random positions once
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, () => ({
      position: [
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 14,
        -5 - Math.random() * 10, // Z between -5 and -15
      ],
      scale: 0.02 + Math.random() * 0.04,
    }))
  }, [])

  // Smooth mouse-driven parallax — pan opposite to mouse direction
  useFrame(() => {
    if (!groupRef.current) return
    // Target: pan the particle field slightly opposite to mouse (inverted for depth illusion)
    targetRotY.current = -mousePos.x * 0.25
    targetRotX.current = -mousePos.y * 0.15

    const damping = 0.04
    groupRef.current.rotation.y +=
      (targetRotY.current - groupRef.current.rotation.y) * damping
    groupRef.current.rotation.x +=
      (targetRotX.current - groupRef.current.rotation.x) * damping
  })

  return (
    <group ref={groupRef}>
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
 * SpatialScene — camera, HDRI environment, lights, and particle void.
 * No Html, no glass mesh — purely a spatial background layer.
 */
function SpatialScene({ mousePos }) {
  return (
    <>
      {/* Perspective Camera */}
      <perspectiveCamera
        args={[50, undefined, 0.1, 1000]}
        position={[0, 0, 8]}
        makeDefault
      />

      {/* Self-hosted HDRI environment for subtle reflections */}
      <Environment files="/hdri/night.hdr" />

      {/* Ambient fill light */}
      <ambientLight intensity={0.3} />

      {/* Directional accent */}
      <directionalLight
        position={[-3, 4, 5]}
        intensity={0.6}
        color="#c4b5fd"
      />

      {/* Particle field — responds to mouse for depth parallax */}
      <Particles mousePos={mousePos} />
    </>
  )
}

/**
 * SpatialCanvas — WebGL background layer only.
 * Renders a deep-space void with particles that pan opposite to the mouse,
 * creating massive perceived depth behind the crisp 2D DOM UI.
 *
 * No Html, no glass mesh, no DOM children — strictly a visual background.
 */
export default function SpatialCanvas({ mousePos }) {
  return (
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
        <SpatialScene mousePos={mousePos} />
      </Canvas>
    </div>
  )
}