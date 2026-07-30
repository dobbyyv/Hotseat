import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

/**
 * BackgroundGroup — subtle ambient animation in the void.
 * Handles weightless float and soft rotation for background depth.
 */
function BackgroundGroup() {
  const groupRef = useRef(null)
  const currentRotX = useRef(0)
  const currentRotY = useRef(0)

  useFrame((state) => {
    const targetRotX = state.pointer.y * 0.04
    const targetRotY = state.pointer.x * 0.04
    const damping = 0.02
    currentRotX.current += (targetRotX - currentRotX.current) * damping
    currentRotY.current += (targetRotY - currentRotY.current) * damping

    const floatY = Math.sin(state.clock.elapsedTime * 0.6) * 0.1

    if (groupRef.current) {
      groupRef.current.rotation.x = currentRotX.current
      groupRef.current.rotation.y = currentRotY.current
      groupRef.current.position.y = floatY
    }
  })

  return <group ref={groupRef} position={[0, 0, 0]} />
}

/**
 * SpatialScene — camera and lighting for the deep-space void.
 */
function SpatialScene() {
  return (
    <>
      <perspectiveCamera
        args={[60, undefined, 0.1, 1000]}
        position={[0, 0, 10]}
        makeDefault
      />
      <ambientLight intensity={0.1} />
      <pointLight position={[-5, 5, 5]} color="#a5b4fc" intensity={0.4} />
      <BackgroundGroup />
    </>
  )
}

/**
 * SpatialCanvas — strictly a WebGL background layer.
 * No DOM portals. No Html. Just the void, lights, and subtle 3D depth.
 */
export default function SpatialCanvas() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#020204' }}
        dpr={[1, 1.5]}
      >
        <SpatialScene />
      </Canvas>
    </div>
  )
}