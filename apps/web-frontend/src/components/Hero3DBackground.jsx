import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  Points,
  PointMaterial,
  Environment,
  PerspectiveCamera,
  Float,
  Instance,
  Instances
} from '@react-three/drei'
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration,
  Noise,
  Vignette
} from '@react-three/postprocessing'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Custom Motion Streak Component (8bit.ai style)
function MotionStreaks({ count = 400 }) {
  const meshRef = useRef()
  
  // Randomly generate positions for the streaks
  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 60
        const y = (Math.random() - 0.5) * 60
        const z = Math.random() * -180
        const scale = Math.random() * 8 + 2
        temp.push({ x, y, z, scale })
    }
    return temp
  }, [count])

  useFrame((state) => {
    const { clock } = state
    const t = clock.getElapsedTime()
    
    // Animate streaks forward (Z-axis)
    particles.forEach((p, i) => {
        p.z += 1.2
        if (p.z > 20) p.z = -180
        
        const matrix = new THREE.Matrix4().setPosition(p.x, p.y, p.z)
        matrix.scale(new THREE.Vector3(0.05, 0.05, p.scale))
        meshRef.current.setMatrixAt(i, matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.3} />
    </instancedMesh>
  )
}

function CameraRig() {
  const { camera } = useThree()
  
  useEffect(() => {
    // GSAP Scroll-linked Camera Path - Full Page
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.5,
      }
    })

    tl.to(camera.position, { z: -150, ease: "power1.inOut" })
      .to(camera.rotation, { z: Math.PI * 3, ease: "power1.inOut" }, 0)
    
    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill())
    }
  }, [camera])

  return null
}

function Scene({ mouse }) {
  const pointsRef = useRef()
  const foregroundRef = useRef()
  
  const particleCount = 8000
  const fgCount = 100

  // Foreground Parallax (Large, blurred chunks)
  const fgPositions = useMemo(() => {
    const pos = new Float32Array(fgCount * 3)
    for (let i = 0; i < fgCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40
      pos[i * 3 + 2] = Math.random() * -100
    }
    return pos
  }, [])

  useFrame((state) => {
    const { clock } = state
    const t = clock.getElapsedTime()
    
    // Mouse Attractor Logic
    if (pointsRef.current) {
        const { x, y } = mouse.current
        pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, x * 0.05, 0.1)
        pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, -y * 0.05, 0.1)
    }

    // Foreground high-speed parallax
    if (foregroundRef.current) {
        foregroundRef.current.position.z += 2.5
        if (foregroundRef.current.position.z > 20) foregroundRef.current.position.z = -80
    }
  })

  return (
    <group>
      <MotionStreaks count={800} />
      
      {/* 8,000 Particle Field (Deeper depth + Mouse Response) */}
      <Points ref={pointsRef} positions={new Float32Array(particleCount * 3).map(() => (Math.random() - 0.5) * 200)} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#7c3aed"
          size={0.15}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.5}
        />
      </Points>

      {/* High-Speed Foreground Layer */}
      <Points ref={foregroundRef} positions={fgPositions} frustumCulled={false}>
          <PointMaterial
              transparent
              color="#a78bfa"
              size={0.8}
              sizeAttenuation={true}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              opacity={0.15}
          />
      </Points>
      
      {/* Hyper-Structure hexagons - Scaled for entire journey */}
      <group position={[0, 0, -100]}>
         {[0, 40, 80, 120, 160, 200].map((z) => (
             <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 6]}>
                 <ringGeometry args={[22, 22.2, 6]} />
                 <meshBasicMaterial color="#7c3aed" transparent opacity={0.08} />
             </mesh>
         ))}
      </group>
    </group>
  )
}

export default function Global8bitBackground() {
  const mouse = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#000000] pointer-events-none">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={75} />
        <color attach="background" args={['#000000']} />
        
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 0, -20]} intensity={40} color="#7c3aed" />
        
        <Scene mouse={mouse} />
        <CameraRig />
        
        <Environment preset="night" />
        
        <EffectComposer multisampling={4}>
          <Bloom luminanceThreshold={0.4} mipmapBlur intensity={3.5} radius={1.2} />
          <ChromaticAberration offset={new THREE.Vector2(0.003, 0.003)} />
          <Noise opacity={0.18} />
          <Vignette eskil={false} offset={0.1} darkness={1.5} />
        </EffectComposer>
      </Canvas>
      
      {/* Advanced Digital Grain */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.08] bg-noise"></div>
    </div>
  )
}
