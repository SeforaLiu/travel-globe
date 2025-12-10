// Earth.tsx
import React, {useRef, useState} from 'react'
import {useFrame, useLoader} from "@react-three/fiber";
import * as THREE from 'three'
import {Html} from '@react-three/drei'
import {TextureLoader} from 'three/src/loaders/TextureLoader'
import {useTranslation} from 'react-i18next'
import {useNavigate} from "react-router-dom";

function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180)  // 纬度转极角
  const theta = (lon + 180) * (Math.PI / 180)  // 经度转方位角

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
  {id: 5, lat: 45.464203, lng: 9.189982, label: 'Milano', color: '#cc66cc', pathId: 1}
]

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Earth({dark, isMobile}: Props) {
  const earthGroupRef = useRef<THREE.Group>(null!)
  const {t} = useTranslation()
  const navigate = useNavigate();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [shouldRotate, setShouldRotate] = useState(true)

  // 使用 useLoader 加载纹理
  const [dayMap, nightMap] = useLoader(TextureLoader, [
    '/textures/day.jpg',
    '/textures/night.jpg'
  ])

  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      // 整个地球组旋转
      earthGroupRef.current.rotation.y += delta * 0.05
    }
  })

  // 处理鼠标进入点标记（PC端）
  const handlePointerEnter = (id: number) => {
    if (!isMobile) {
      setHoveredPoint(id)
      setShouldRotate(false) // 停止地球旋转
    }
  }

  // 处理鼠标离开点标记（PC端）
  const handlePointerLeave = () => {
    setHoveredPoint(null)
    if (!isMobile) {
      setTimeout(() => {
        setShouldRotate(true)
      }, 1000)
    }
  }

  // 统一的点击处理函数
  const handleClick = (e: any, pathId: number) => {
    e.stopPropagation()

    // 移动端触觉反馈（如果支持）
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }

    console.log('点击要进去看日记!!!')
    navigate(`/diary/:${pathId}`)
  }

  return (
    <group>
      {/* 地球主体组 - 包含地球和所有点 */}
      <group ref={earthGroupRef} scale={1.5}>
        {/* 地球球体 */}
        <mesh>
          <sphereGeometry args={[2, 64, 64]}/>
          <meshStandardMaterial
            map={dayMap}
          />
        </mesh>

        {/* 在 dark 模式下叠加夜晚纹理 */}
        {dark && (
          <mesh>
            <sphereGeometry args={[2, 64, 64]}/>
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

          // 移动端永远显示，PC端只在悬停时显示
          const shouldShowLabel = isMobile ? true : isHovered

          return (
            <group
              key={p.id}
              position={pos.toArray()}
              scale={isHovered ? 1 : 0.5}
              // 统一在这里处理点击事件
              onClick={(e) => handleClick(e, p.pathId)}
            >
              {/* 点标记 - 只保留悬停事件 */}
              <mesh
                onPointerEnter={() => handlePointerEnter(p.id)}
                onPointerLeave={handlePointerLeave}
              >
                <sphereGeometry args={[0.04, 8, 8]}/>
                <meshStandardMaterial
                  color={p.color}
                  // 悬停时改变颜色（PC端）
                  emissive={(!isMobile && isHovered) ? p.color : '#ffffff'}
                  emissiveIntensity={(!isMobile && isHovered) ? 0.5 : 0}
                />
              </mesh>

              {/* 文字标签 */}
              {shouldShowLabel && (
                <Html
                  position={[0, 0.1, 0]}  // 在点上方一点
                  distanceFactor={8}
                  center
                  occlude
                  // 不需要 onClick，因为 group 已经处理了
                  scale={2}
                >
                  <div
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