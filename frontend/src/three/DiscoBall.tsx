import React, {useMemo, useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Sphere, useEnvironment} from '@react-three/drei'
import * as THREE from 'three'

type DiscoBallProps = {
  radius?: number
  tileSize?: number
  scale?: number | [number, number, number]
  color?: string
}

export default function DiscoBall({
                                    radius = 2,
                                    tileSize = 0.15,
                                    scale = 1,
                                    color = '#888888'
                                  }: DiscoBallProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const temp = new THREE.Object3D()

  const envMap = useEnvironment({
    files: [
      '/textures/environmentMaps/0/px.png',
      '/textures/environmentMaps/0/nx.png',
      '/textures/environmentMaps/0/py.png',
      '/textures/environmentMaps/0/ny.png',
      '/textures/environmentMaps/0/pz.png',
      '/textures/environmentMaps/0/nz.png',
    ]
  })

  const tiles = useMemo(() => {
    const result: {
      position: THREE.Vector3
      rotation: THREE.Euler
      scale: THREE.Vector3
    }[] = []

    // 辅助对象，用于计算旋转
    const dummy = new THREE.Object3D()

    // 起始角度：从南极附近开始 (-PI/2)
    let currentPhi = -Math.PI / 2

    // 循环直到到达北极 (PI/2)
    // 使用 while 循环代替 for 循环，确保层与层之间紧密堆叠
    while (currentPhi < Math.PI / 2) {

      // 1. 判断当前纬度区域
      // 接近 +/- PI/2 (约1.57) 为极点。这里设定阈值 1.1 (约63度)
      const isHighLat = Math.abs(currentPhi) > 1.1

      // 2. 动态设置 Overlap (解决缝隙问题)
      // 中纬度: 1.0 (无重叠，清晰)
      // 高纬度: 1.15 (重叠，遮盖缝隙)
      const overlap = isHighLat ? 1.15 : 1.0

      // 3. 计算当前圈的几何参数
      // ringRadius: 当前纬度圈的水平半径
      // y: 当前纬度圈的高度
      const ringRadius = Math.cos(currentPhi) * radius
      const y = Math.sin(currentPhi) * radius

      // 计算这一圈的周长
      const circumference = 2 * Math.PI * ringRadius

      // 4. 计算这一圈能放多少个贴片
      // 保持贴片宽度大致为 tileSize
      let tilesInRing = Math.floor(circumference / tileSize)

      // 5. 极点处理 (Cap)
      // 如果一圈放不下3个贴片，说明非常接近极点，直接跳过，
      // 我们会在循环结束后单独加盖子，或者让下一层循环处理
      if (tilesInRing < 3) {
        // 即使跳过，也要增加角度，防止死循环
        // 极点附近的步长可以稍微大一点，快速跨过
        currentPhi += (tileSize / radius)
        continue
      }

      // 6. 生成当前圈的贴片
      for (let j = 0; j < tilesInRing; j++) {
        const u = j / tilesInRing
        const theta = u * Math.PI * 2 // 经度角度

        const x = Math.cos(theta) * ringRadius
        const z = Math.sin(theta) * ringRadius

        dummy.position.set(x, y, z)
        dummy.lookAt(0, 0, 0) // 面向球心

        // --- 核心缩放逻辑 ---
        // Scale X:
        // (circumference / tilesInRing) 是当前每个贴片分到的实际弧长
        // 除以 tileSize 得到缩放比例，确保填满圆周
        const scaleX = (circumference / tilesInRing) / tileSize * overlap

        // Scale Y:
        // 保持为 1 (即 tileSize 高度)，乘以 overlap
        // 注意：这里不再缩小极点贴片的高度，保证行高一致，解决"4圈间隙大"的问题
        const scaleY = 1 * overlap

        result.push({
          position: new THREE.Vector3(x, y, z),
          rotation: dummy.rotation.clone(),
          scale: new THREE.Vector3(scaleX, scaleY, 1)
        })
      }

      // 7. 计算下一层的角度步长 (关键修改)
      // 我们希望下一层贴片正好接在这一层上面
      // 弧长公式: L = r * angle -> angle = L / r
      // 这里 L 就是贴片的高度 (tileSize)
      const dPhi = tileSize / radius

      // 累加角度
      currentPhi += dPhi
    }

    // --- 极点补丁 (Pole Caps) ---
    const capScale = 1.2 // 稍微大一点盖住边缘

    // 北极盖子
    result.push({
      position: new THREE.Vector3(0, radius, 0),
      rotation: new THREE.Euler(Math.PI / 2, 0, 0), // 90度朝上
      scale: new THREE.Vector3(1, 1, 1).multiplyScalar(capScale)
    })

    // 南极盖子
    result.push({
      position: new THREE.Vector3(0, -radius, 0),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0), // -90度朝下
      scale: new THREE.Vector3(1, 1, 1).multiplyScalar(capScale)
    })

    return result
  }, [radius, tileSize])

  useFrame(() => {
    if (!meshRef.current) return

    // 批量更新矩阵
    tiles.forEach((tile, i) => {
      temp.position.copy(tile.position)
      temp.rotation.copy(tile.rotation)
      temp.scale.copy(tile.scale)
      temp.updateMatrix()
      meshRef.current.setMatrixAt(i, temp.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true

    // 旋转动画
    // meshRef.current.rotation.y += 0.002
  })

  return (
    <group scale={scale}>
      {/* 内部黑球：作为缝隙的背景色 */}
      <Sphere args={[radius * 0.98, 32, 32]}>
        <meshBasicMaterial color="#000000"/>
      </Sphere>

      <instancedMesh
        ref={meshRef}
        args={[null, null, tiles.length]}
      >
        {/*
          几何体:
          使用 BoxGeometry
         */}
        <boxGeometry args={[tileSize, tileSize, 0.05]}/>
        <meshStandardMaterial
          color={color}
          metalness={2}
          roughness={0.1} // 极致光滑
          envMap={envMap}
          envMapIntensity={1}
        />
      </instancedMesh>
    </group>
  )
}
