// Earth.tsx
import React, {useRef} from 'react'
import {useFrame, useLoader} from "@react-three/fiber"; // 导入 useLoader
import * as THREE from 'three'
import {Float, Html, Text} from '@react-three/drei'
import {TextureLoader} from 'three/src/loaders/TextureLoader'
import {useTranslation} from 'react-i18next'

function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = (radius * Math.sin(phi) * Math.sin(theta))
  const y = (radius * Math.cos(phi))
  return new THREE.Vector3(x, y, z)
}

const points = [
  {id: 1, lat: 31.2304, lon: 121.4737, label: 'Shanghai', color: '#ff6666'},
  {id: 2, lat: 48.8566, lon: 2.3522, label: 'Paris', color: '#9b5cf6'},
  {id: 3, lat: 40.7128, lon: -74.0060, label: 'New York', color: '#ff6666'}
]

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Earth({dark, isMobile}: Props) {
  const mesh = useRef<THREE.Group>(null!)
  const {t} = useTranslation()

  // 使用 useLoader 加载纹理
  const [dayMap, nightMap] = useLoader(TextureLoader, [
    '/textures/day.jpg',
    '/textures/night.jpg'
  ])

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={mesh} position-x={isMobile? 0 : 0 }>
      <mesh scale={1.5}>
        <sphereGeometry args={[2, 64, 64]}/>
        <meshStandardMaterial
          map={dayMap}
        />
      </mesh>

      {/* 在 dark 模式下叠加夜晚纹理 */}
      {dark && (
        <mesh scale={1.5}>
          <sphereGeometry args={[2, 64, 64]}/>
          <meshBasicMaterial
            map={nightMap}
            transparent={true}
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/*<Float>*/}
      {/*  <Text*/}
      {/*    font="./fonts/bangers-v20-latin-regular.woff"*/}
      {/*    fontSize={0.6}*/}
      {/*    position={[4.5, -0.7, 0]}*/}
      {/*    maxWidth={2}*/}
      {/*    textAlign="center"*/}
      {/*  >{t('title')}</Text>*/}
      {/*</Float>*/}


      {/*{points.map(p => {*/}
      {/*  const pos = latLonToCartesian(p.lat, p.lon, 2.02)*/}
      {/*  return (*/}
      {/*    <group key={p.id} position={pos.toArray()}>*/}
      {/*      <mesh>*/}
      {/*        <sphereGeometry args={[0.04, 8, 8]} />*/}
      {/*        <meshStandardMaterial emissive={p.color} color={p.color} />*/}
      {/*      </mesh>*/}
      {/*      <Html distanceFactor={10}>*/}
      {/*        <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">{p.label}</div>*/}
      {/*      </Html>*/}
      {/*    </group>*/}
      {/*  )*/}
      {/*})}*/}
    </group>
  )
}