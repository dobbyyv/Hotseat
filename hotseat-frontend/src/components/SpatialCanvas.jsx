import { useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'

/**
 * AnchorGroup — the Primary Spatial Anchor.
 * Handles mouse-driven parallax, weightless float, and hosts the DOM portal target.
 */
function AnchorGroup({ onAnchorRef }) {
  const groupRef = useRef(null)
  const currentRotX = useRef(0)
  const currentRotY = useRef(0)
  const [domNode, setDomNode] = useState(null)

  // Capture the glass container's DOM node for portal rendering
  const handleRef = useCallback((node) => {
    if (node && !domNode) {
      setDomNode(node)
      onAnchorRef(node)
    }
  }, [domNode, onAnchorRef])

  useFrame((state) => {
    // --- Mouse Parallax ---
    // Target rotation based on pointer position (capped at ±0.08 rad)
    const targetRotX = state.pointer.y * 0.08
    const targetRotY = state.pointer.x * 0.08

    // Smooth lerp with damping factor for weighted, fluid motion
    const damping = 0.04
    currentRotX.current += (targetRotX - currentRotX.current) * damping
    currentRotY.current += (targetRotY - currentRotY.current) * damping

    // --- Weightless Float ---
    const floatY = Math.sin(state.clock.elapsedTime * 0.8) * 0.15

    if (groupRef.current) {
      groupRef.current.rotation.x = currentRotX.current
      groupRef.current.rotation.y = currentRotY.current
      groupRef.current.position.y = floatY
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Html
        transform
        occlude={false}
        center
        style={{ pointerEvents: 'auto', userSelect: 'auto' }}
      >
        <div
          ref={handleRef}
          className="bg-zinc-950/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl p-8 max-w-xl min-w-[360px]"
        />
      </Html>
    </group>
  )
}

/**
 * SpatialScene — camera, lights, and the anchor group.
 */
function SpatialScene({ onAnchorRef }) {
  return (
    <>
      {/* Perspective Camera — fov 60, positioned at Z=10 */}
      <perspectiveCamera
        args={[60, undefined, 0.1, 1000]}
        position={[0, 0, 10]}
        makeDefault
      />

      {/* Ambient Light — minimal environmental context */}
      <ambientLight intensity={0.1} />

      {/* Point Light — soft indigo moonlight, NO shadows */}
      <pointLight
        position={[-5, 5, 5]}
        color="#a5b4fc"
        intensity={0.4}
      />

      {/* Primary Spatial Anchor with parallax + float */}
      <AnchorGroup onAnchorRef={onAnchorRef} />
    </>
  )
}

/**
 * SpatialCanvas — persistent 2.5D WebGL background layer.
 *
 * Renders a Three.js scene as the application background and portals
 * its children (route content) into a floating glass container anchored
 * in 3D space at the Primary Spatial Anchor.
 */
export default function SpatialCanvas({ children }) {
  const [anchorRef, setAnchorRef] = useState(null)

  return (
    <>
      {/* 3D background layer — never blocks pointer events */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas
          gl={{ antialias: true, alpha: false }}
          style={{ background: '#020204' }}
          dpr={[1, 1.5]}
        >
          <SpatialScene onAnchorRef={setAnchorRef} />
        </Canvas>
      </div>

      {/* Portal route content into the floating glass container */}
      {anchorRef && createPortal(children, anchorRef)}
    </>
  )
}