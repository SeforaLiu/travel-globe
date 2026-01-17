// frontend/src/three/DiscoBall.tsx
import React, {useMemo, useRef, useEffect} from 'react'
import {useFrame} from '@react-three/fiber'
import {Sphere, useEnvironment} from '@react-three/drei'
import * as THREE from 'three'

// 定义颜色类型
type HSLColor = { h: number; s: number; l: number }

type DiscoBallProps = {
  radius?: number
  tileSize?: number
  scale?: number | [number, number, number]
  moodVector?: number // 0 ~ 1
  colorLow?: HSLColor
  colorHigh?: HSLColor
  handleBackgroundClick:()=>void
}

// --- 自定义材质组件 ---
const DiscoMaterial = ({
                         moodVector,
                         colorLow,
                         colorHigh,
                         radius // 接收半径用于 Shader 计算
                       }: {
  moodVector: number,
  colorLow: HSLColor,
  colorHigh: HSLColor,
  radius: number
}) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)

  const cLow = useMemo(() => new THREE.Color().setHSL(colorLow.h, colorLow.s, Math.max(colorLow.l, 0.25)), [colorLow])
  const cHigh = useMemo(() => new THREE.Color().setHSL(colorHigh.h, colorHigh.s, colorHigh.l), [colorHigh])

  const uniforms = useRef({
    uTime: { value: 0 },
    uColorLow: { value: cLow },
    uColorHigh: { value: cHigh },
    uMood: { value: moodVector }
  })

  useEffect(() => {
    uniforms.current.uColorLow.value.copy(cLow)
    uniforms.current.uColorHigh.value.copy(cHigh)
    uniforms.current.uMood.value = moodVector
  }, [cLow, cHigh, moodVector])

  useFrame((state) => {
    if (materialRef.current) {
      uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.5
    }
  })

  // @ts-ignore
  const onBeforeCompile = (shader: THREE.Shader) => {
    shader.uniforms.uTime = uniforms.current.uTime
    shader.uniforms.uColorLow = uniforms.current.uColorLow
    shader.uniforms.uColorHigh = uniforms.current.uColorHigh
    shader.uniforms.uMood = uniforms.current.uMood

    // --- 1. Vertex Shader 修改 ---
    shader.vertexShader = `
      varying float vYLevel;
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      vec4 instanceCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      // 修复：根据实际半径归一化 Y 轴
      // y 范围是 [-radius, radius]
      // (y / radius) 范围是 [-1, 1]
      // * 0.5 + 0.5 范围变成 [0, 1]
      float r = ${radius.toFixed(1)}; 
      vYLevel = (instanceCenter.y / r) * 0.5 + 0.5; 
      `
    )

    // --- 2. Fragment Shader 修改 ---
    shader.fragmentShader = `
      uniform float uTime;
      uniform vec3 uColorLow;
      uniform vec3 uColorHigh;
      uniform float uMood;
      varying float vYLevel;
      ${shader.fragmentShader}
    `.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      
      // 调整波浪参数，使其更连贯
      float wave = sin(vYLevel * 5.0 - uTime * 2.0) * 0.5 + 0.5;
      
      float bias = uMood; 
      float mixFactor = mix(bias, wave, 0.3);
      
      vec3 gradientColor = mix(uColorLow, uColorHigh, clamp(mixFactor, 0.0, 1.0));
      
      // 应用颜色
      diffuseColor.rgb = gradientColor;
      `
    )

    materialRef.current.userData.shader = shader
  }

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

  return (
    <meshStandardMaterial
      ref={materialRef}
      metalness={2.0}
      roughness={0.1} // 稍微增加一点粗糙度，让颜色更容易显现，同时保持金属感
      envMap={envMap}
      envMapIntensity={1.8} // 稍微增强环境光反射，弥补金属感
      onBeforeCompile={onBeforeCompile}
    />
  )
}

export default function DiscoBall({
                                    radius = 2,
                                    tileSize = 0.15,
                                    scale = 1,
                                    moodVector = 0.5,
                                    colorLow = {h: 0.65, s: 0.9, l: 0.15},
                                    colorHigh = {h: 0.08, s: 1.0, l: 0.6},
                                    handleBackgroundClick
                                  }: DiscoBallProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const temp = new THREE.Object3D()

  const tiles = useMemo(() => {
    const result: {
      position: THREE.Vector3
      rotation: THREE.Euler
      scale: THREE.Vector3
    }[] = []
    const dummy = new THREE.Object3D()
    let currentPhi = -Math.PI / 2
    while (currentPhi < Math.PI / 2) {
      const isHighLat = Math.abs(currentPhi) > 1.1
      const overlap = isHighLat ? 1.15 : 1.0
      const ringRadius = Math.cos(currentPhi) * radius
      const y = Math.sin(currentPhi) * radius
      const circumference = 2 * Math.PI * ringRadius
      let tilesInRing = Math.floor(circumference / tileSize)
      if (tilesInRing < 3) {
        currentPhi += (tileSize / radius)
        continue
      }
      for (let j = 0; j < tilesInRing; j++) {
        const u = j / tilesInRing
        const theta = u * Math.PI * 2
        const x = Math.cos(theta) * ringRadius
        const z = Math.sin(theta) * ringRadius
        dummy.position.set(x, y, z)
        dummy.lookAt(0, 0, 0)
        const scaleX = (circumference / tilesInRing) / tileSize * overlap
        const scaleY = 1 * overlap
        result.push({
          position: new THREE.Vector3(x, y, z),
          rotation: dummy.rotation.clone(),
          scale: new THREE.Vector3(scaleX, scaleY, 1)
        })
      }
      const dPhi = tileSize / radius
      currentPhi += dPhi
    }
    // 顶部和底部盖子
    const capScale = 1.2
    result.push({
      position: new THREE.Vector3(0, radius, 0),
      rotation: new THREE.Euler(Math.PI / 2, 0, 0),
      scale: new THREE.Vector3(1, 1, 1).multiplyScalar(capScale)
    })
    result.push({
      position: new THREE.Vector3(0, -radius, 0),
      rotation: new THREE.Euler(-Math.PI / 2, 0, 0),
      scale: new THREE.Vector3(1, 1, 1).multiplyScalar(capScale)
    })
    return result
  }, [radius, tileSize])

  useFrame(() => {
    if (!meshRef.current) return
    if (meshRef.current.instanceMatrix.needsUpdate) return;

    tiles.forEach((tile, i) => {
      temp.position.copy(tile.position)
      temp.rotation.copy(tile.rotation)
      temp.scale.copy(tile.scale)
      temp.updateMatrix()
      meshRef.current.setMatrixAt(i, temp.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group scale={scale}
           onClick={handleBackgroundClick}
         >
      {/* 内部黑色球体，防止缝隙漏光 */}
      <Sphere args={[radius * 0.98, 32, 32]}>
        <meshBasicMaterial color="#000000"/>
      </Sphere>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, tiles.length]}
      >
        <boxGeometry args={[tileSize, tileSize, 0.05]}/>

        {/* 传递 radius 给材质组件 */}
        <DiscoMaterial
          moodVector={moodVector}
          colorLow={colorLow}
          colorHigh={colorHigh}
          radius={radius}
        />

      </instancedMesh>
    </group>
  )
}
