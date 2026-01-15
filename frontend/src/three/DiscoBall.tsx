// DiscoBall.tsx
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
}

// --- 自定义材质组件 ---
// 将材质逻辑分离，保持代码整洁
const DiscoMaterial = ({ moodVector, colorLow, colorHigh }: { moodVector: number, colorLow: HSLColor, colorHigh: HSLColor }) => {
  console.log('中位数:',moodVector)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)

  // 将 HSL 配置转换为 THREE.Color
  const cLow = useMemo(() => new THREE.Color().setHSL(colorLow.h, colorLow.s, Math.max(colorLow.l, 0.25)), [colorLow])
  const cHigh = useMemo(() => new THREE.Color().setHSL(colorHigh.h, colorHigh.s, colorHigh.l), [colorHigh])

  // 初始化 Shader 的 Uniforms
  const uniforms = useRef({
    uTime: { value: 0 },
    uColorLow: { value: cLow },
    uColorHigh: { value: cHigh },
    uMood: { value: moodVector }
  })

  // 当 props 变化时更新 uniforms
  useEffect(() => {
    uniforms.current.uColorLow.value.copy(cLow)
    uniforms.current.uColorHigh.value.copy(cHigh)
    // 使用 lerp 让心情变化时颜色过渡更平滑
    // 这里直接赋值，shader 内部会处理混合
    uniforms.current.uMood.value = moodVector
  }, [cLow, cHigh, moodVector])

  useFrame((state) => {
    if (materialRef.current) {
      // 更新时间，控制流动速度 (0.5 是速度系数)
      uniforms.current.uTime.value = state.clock.getElapsedTime() * 0.5
    }
  })

  // @ts-ignore
  const onBeforeCompile = (shader: THREE.Shader) => {
    // 注入 uniforms
    shader.uniforms.uTime = uniforms.current.uTime
    shader.uniforms.uColorLow = uniforms.current.uColorLow
    shader.uniforms.uColorHigh = uniforms.current.uColorHigh
    shader.uniforms.uMood = uniforms.current.uMood

    // --- 1. Vertex Shader 修改 ---
    // 我们需要获取每个 Instance (晶块) 在球体上的原始高度，用于生成渐变
    shader.vertexShader = `
      varying float vYLevel; // 传递给 Fragment Shader 的高度变量
      ${shader.vertexShader}
    `.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      
      // 计算 Instance 的中心位置 (在模型空间中)
      // instanceMatrix 是 InstancedMesh 自动提供的
      vec4 instanceCenter = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      
      // 归一化高度: 将 y 从 [-radius, radius] 映射到 [0, 1]
      // 假设半径约为 2 (根据 MoodSphere 配置)
      vYLevel = instanceCenter.y * 0.5 + 0.5; 
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
      
      // --- 流动渐变逻辑 ---
      
      // 1. 创建波浪: 使用 sin 函数结合高度和时间
      // vYLevel * 3.0: 决定波浪的密度
      // uTime: 决定波浪的移动
      float wave = sin(vYLevel * 4.0 - uTime) * 0.5 + 0.5;
      
      // 2. 混合心情因子
      // uMood (0~1) 决定了整体偏向哪种颜色
      // 我们将波浪叠加在 Mood 之上
      // mixFactor 越接近 0 越偏向 LowColor，越接近 1 越偏向 HighColor
      
      // 基础偏置：心情越好，整体越亮
      float bias = uMood; 
      
      // 混合：70% 由心情决定，30% 由波浪决定 (产生流动感但不喧宾夺主)
      float mixFactor = mix(bias, wave, 0.3);
      
      // 3. 计算最终颜色
      vec3 gradientColor = mix(uColorLow, uColorHigh, clamp(mixFactor, 0.0, 1.0));
      
      // 4. 应用颜色
      // 保持原本的 diffuseColor (如果有贴图的话)，这里直接覆盖 RGB
      diffuseColor.rgb = gradientColor;
      `
    )

    // 保存 shader 引用以便后续更新 uniforms (虽然这里用了引用传递，通常不需要这一步，但为了保险)
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
      metalness={1.12} // 稍微降低一点金属度，让底色更明显
      roughness={0.1}
      envMap={envMap}
      envMapIntensity={1}
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
                                    colorHigh = {h: 0.08, s: 1.0, l: 0.6}
                                  }: DiscoBallProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const temp = new THREE.Object3D()

  // ... (tiles 计算逻辑保持完全不变，直接复用之前的代码)
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
    // 只需要初始化一次矩阵，除非你想让晶块本身移动
    // 如果 tiles 是静态的，其实可以在 useEffect 里做
    // 但为了保险起见（防止 context 丢失），这里保留
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
    <group scale={scale}>
      <Sphere args={[radius * 0.98, 32, 32]}>
        <meshBasicMaterial color="#000000"/>
      </Sphere>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, tiles.length]}
      >
        <boxGeometry args={[tileSize, tileSize, 0.05]}/>

        {/* 使用我们自定义的材质组件 */}
        <DiscoMaterial
          moodVector={moodVector}
          colorLow={colorLow}
          colorHigh={colorHigh}
        />

      </instancedMesh>
    </group>
  )
}
