import React, {useRef, useState, useEffect} from 'react'
import {useFrame, useLoader} from "@react-three/fiber";
import * as THREE from 'three'
import {Html} from '@react-three/drei'
import {TextureLoader} from 'three/src/loaders/TextureLoader'
import {useTranslation} from 'react-i18next'
import {useNavigate} from "react-router-dom";
import {Perf} from "r3f-perf";

function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

const points = [
  {id: 1, lat: 23.1290799, lng: 113.26436, label: 'Guangzhou', color: '#ff6666', pathId: 1},
  {id: 2, lat: 40.712776, lng: -74.005974, label: 'New York', color: '#ff6666', pathId: 1},
  {id: 3, lat: 31.230416, lng: 121.473701, label: 'Shanghai', color: '#ff6666', pathId: 1},
  {id: 4, lat: 41.008240, lng: 28.978359, label: 'Istanbul', color: '#ff6666', pathId: 1},
  {id: 5, lat: 45.464203, lng: 9.189982, label: 'Milano', color: '#cc66cc', pathId: 1},
  {id: 6, lat: 39.904202, lng: 116.407394, label: 'Beijing', color: '#ff6666', pathId: 1},
  {id: 7, lat: 43.825592, lng: 87.616848, label: 'Wulumuqi', color: '#ff6666', pathId: 1},
  {id: 8, lat: 41.902782, lng: 12.496366, label: 'Roma', color: '#cc66cc', pathId: 1},
  {id: 9, lat: 51.507351, lng: -0.127758, label: 'London', color: '#cc66cc', pathId: 1},
]

type Props = {
  dark: boolean;
  isMobile: boolean;
  showLabels: boolean;
};

export default function Earth({dark, isMobile, showLabels}: Props) {
  const earthGroupRef = useRef<THREE.Group>(null!)
  const earthMeshRef = useRef<THREE.Mesh>(null!)

  const {t} = useTranslation()
  const navigate = useNavigate();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [shouldRotate, setShouldRotate] = useState(true)

  const [dayMap, nightMap] = useLoader(TextureLoader, [
    '/textures/8k_day.jpg',
    '/textures/night.jpg'
  ])

  useEffect(()=>{
    dayMap.anisotropy = 16;
    dayMap.needsUpdate = true;
  },[dayMap])


  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      earthGroupRef.current.rotation.y += delta * 0.05
    }
  })

  const handlePointerEnter = (id: number) => {
    if (!isMobile) {
      setHoveredPoint(id)
      setShouldRotate(false)
    }
  }

  const handlePointerLeave = () => {
    setHoveredPoint(null)
    if (!isMobile) {
      setTimeout(() => {
        setShouldRotate(true)
      }, 1000)
    }
  }

  const handleClick = (e: any, pathId: number) => {
    e.stopPropagation()
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
    console.log('点击跳转:', pathId)
    navigate(`/diary/${pathId}`)
  }

  const visualPointSize = isMobile ? 0.04 : 0.025;
  const hitBoxSize = isMobile ? 0.15 : 0.08;

  const earthGeometry = new THREE.SphereGeometry(2, 64, 64)

  return (
    <group>
      {!isMobile && <Perf position="top-left"/>}
      <group ref={earthGroupRef} scale={1.5}>
        {/* 地球球体 */}
        <mesh ref={earthMeshRef} geometry={earthGeometry}>
          <meshStandardMaterial map={dayMap} />
        </mesh>

        {dark && (
          <mesh geometry={earthGeometry}>
            <meshBasicMaterial
              map={nightMap}
              transparent={true}
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {points.map(p => {
          const pos = latLonToCartesian(p.lat, p.lng, 2.02)
          const isHovered = hoveredPoint === p.id
          const shouldShowLabel = isMobile ? showLabels : isHovered

          return (
            <group
              key={p.id}
              position={pos.toArray()}
            >
              <mesh
                visible={false}
                onClick={(e) => handleClick(e, p.pathId)}
                onPointerEnter={() => handlePointerEnter(p.id)}
                onPointerLeave={handlePointerLeave}
              >
                <sphereGeometry args={[hitBoxSize, 8, 8]}/>
                <meshBasicMaterial transparent opacity={0}/>
              </mesh>

              <mesh>
                <sphereGeometry args={[visualPointSize, 16, 16]}/>
                <meshStandardMaterial
                  color={p.color}
                  emissive={(!isMobile && isHovered) ? p.color : '#ffffff'}
                  emissiveIntensity={(!isMobile && isHovered) ? 0.8 : 0}
                />
              </mesh>

              {shouldShowLabel && (
                <Html
                  position={[0, 0.1, 0]}
                  distanceFactor={8}
                  center
                  occlude={[earthMeshRef]}
                  scale={2}
                  style={{pointerEvents: 'none'}}
                  zIndexRange={[100, 0]}
                >
                  <div
                    style={{pointerEvents: 'auto'}}
                    onClick={(e) => handleClick(e, p.pathId)}
                    className={`
                      bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap
                      cursor-pointer transition-opacity duration-200
                      ${isHovered ? 'opacity-100' : 'opacity-90'}
                    `}
                  >
                    {p.label}
                  </div>
                </Html>
              )}
            </group>
          )
        })}
      </group>
    </group>
  )
}