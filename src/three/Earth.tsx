// Earth.tsx
import React, { useRef } from 'react'
import { useFrame, useLoader } from "@react-three/fiber"; // 导入 useLoader
import * as THREE from 'three'
import { Html } from '@react-three/drei'

// 导入 TextureLoader
import { TextureLoader } from 'three/src/loaders/TextureLoader'

function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = - (radius * Math.sin(phi) * Math.cos(theta))
  const z = (radius * Math.sin(phi) * Math.sin(theta))
  const y = (radius * Math.cos(phi))
  return new THREE.Vector3(x, y, z)
}

const points = [
  { id: 1, lat: 31.2304, lon: 121.4737, label: 'Shanghai', color: '#ff6666' },
  { id: 2, lat: 48.8566, lon: 2.3522, label: 'Paris', color: '#9b5cf6' },
  { id: 3, lat: 40.7128, lon: -74.0060, label: 'New York', color: '#ff6666' }
]

export default function Earth() {
  const mesh = useRef<THREE.Group>(null!)

  // 使用 useLoader 加载纹理
  const [dayMap] = useLoader(TextureLoader, [
    '/textures/day.jpg',
  ])

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.1
  })

  return (
    <group ref={mesh}>
      {/* 基础地球网格 */}
      <mesh scale={1.5}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={dayMap}
          // color 属性可以移除或设置为白色 (如果使用 map)，因为纹理会提供颜色
          // color="#4488ff" 
        />
      </mesh>

      {points.map(p => {
        const pos = latLonToCartesian(p.lat, p.lon, 2.02)
        return (
          <group key={p.id} position={pos.toArray()}>
            <mesh>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial emissive={p.color} color={p.color} />
            </mesh>
            <Html distanceFactor={10}>
              <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">{p.label}</div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}