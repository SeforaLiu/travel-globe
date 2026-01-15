import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// --- 1. 顶点着色器  ---
const vertexShader = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

// --- 2. 片元着色器 ---
const fragmentShader = `
  uniform float uTime;
  uniform vec3 uBaseColor;
  varying vec3 vWorldPosition;

  #define PI 3.14159265359

  // 简单的伪随机函数
  float random(float n) {
      return fract(sin(n) * 43758.5453123);
  }

  void main() {
    vec3 viewDir = normalize(vWorldPosition);
    vec3 finalColor = uBaseColor;

    // --- 配置 ---
    float numLights = 12.0;     // 光点数量
    float spotSharpness = 40.0; // 清晰度：越小越清晰
    float brightness = 1.0;     // 亮度

    for(float i = 0.0; i < 18.0; i++) {
        // --- 核心修正：球坐标系分布 ---
        
        // 1. 水平角度 (Theta): 
        // 使用 (i / numLights) 强制让光点均匀分布在 360 度圆周上
        // 加上 uTime 让它们整体旋转
        // 加上 random(i) 增加一点随机初始偏移，避免排成一条直线
        float theta = (i / numLights) * 2.0 * PI + uTime * 0.2 + random(i) * 2.0;

        // 2. 垂直角度 (Phi):
        // 范围从 0 (北极) 到 PI (南极)
        // 使用 sin(uTime) 让光点上下浮动
        float phi = acos( -1.0 + (2.0 * (i + 1.0)) / (numLights + 1.0) ); // 均匀分布算法
        // 加上动态摆动
        phi += sin(uTime * 0.5 + i * 10.0) * 0.3; 

        // 3. 球坐标转笛卡尔坐标 (Spherical to Cartesian)
        // 这样生成的向量一定是在球面上均匀分布的
        vec3 lightDir = vec3(
            sin(phi) * cos(theta),
            cos(phi),
            sin(phi) * sin(theta)
        );

        // --- 渲染逻辑 (同之前) ---
        float alignment = dot(viewDir, lightDir);
        float intensity = max(0.0, alignment);
        
        // 指数衰减，形成光斑
        intensity = pow(intensity, spotSharpness);

        // 颜色循环
        vec3 lightColor = 0.5 + 0.5 * cos(uTime * 0.3 + vec3(0.0, 2.0, 4.0) + i * 0.5);

        finalColor += lightColor * intensity * brightness;
    }

    // 噪点 (Dithering) 防止色带
    float noise = fract(sin(dot(vWorldPosition.xy, vec2(12.9898,78.233))) * 43758.5453);
    finalColor += noise * 0.015;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

type Props = {
  baseColor?: string
}

export function DiscoLightsBackground({ baseColor = '#020205' }: Props) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(baseColor) },
    }),
    [baseColor]
  )

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  return (
    <mesh ref={meshRef} scale={[80, 80, 80]}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  )
}
