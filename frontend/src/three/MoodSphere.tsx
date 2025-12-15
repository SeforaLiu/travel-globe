import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function MoodSphere() {
  const pointsRef = useRef<any>(null)
  const count = 200
  const radius = 1.6
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const theta = 2 * Math.PI * Math.random()
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
  }

  useFrame((_, delta) => {
    if (pointsRef.current) pointsRef.current.rotation.y += delta * 0.2
  })

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} itemSize={3} count={positions.length / 3}/>
        </bufferGeometry>
        <pointsMaterial size={0.03} sizeAttenuation/>
      </points>
    </group>
  )
}
