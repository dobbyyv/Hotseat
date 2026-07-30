import { Canvas } from '@react-three/fiber'
import { Html } from '@react-three/drei'

/**
 * SpatialScene — the 3D atmosphere rendered inside the Canvas.
 * Contains the camera, lighting, and the Primary Spatial Anchor.
 */
function SpatialScene() {
  return (
    <>
      {/* TASK 2: Perspective Camera */}
      <perspectiveCamera
        args={[60, undefined, 0.1, 1000]}
        position={[0, 0, 10]}
        makeDefault
      />

      {/* TASK 2: Ambient Light — minimal environmental context */}
      <ambientLight intensity={0.1} />

      {/* TASK 2: Point Light — soft indigo moonlight, NO shadows */}
      <pointLight
        position={[-5, 5, 5]}
        color="#a5b4fc"
        intensity={0.4}
      />

      {/* TASK 3: Primary Spatial Anchor */}
      <group position={[0, 0, 0]}>
        <Html
          transform
          occlude={false}
          center
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="bg-white/[0.05] border border-white/10 backdrop-blur-md rounded-2xl p-20 text-5xl font-mono text-zinc-50 whitespace-nowrap">
            THE SPATIAL ANCHOR HAS BEEN DEPLOYED
          </div>
        </Html>
      </group>
    </>
  )
}

/**
 * SpatialCanvas — permanent 2.5D WebGL background layer.
 * Replaces the old CSS gradient background with a deep-space 3D scene.
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