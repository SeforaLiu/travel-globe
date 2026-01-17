import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'

type Props = {
  dark: boolean;
};

// --- Shaders (GLSL) ---

// 顶点着色器：负责处理顶点位置和传递 UV
const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  // 标准的投影变换
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// 片元着色器：负责像素颜色计算（云、星星、渐变）
const fragmentShader = `
uniform float uTime;
uniform float uDark; // 0.0 = 白天, 1.0 = 黑夜
uniform vec3 uDayTopColor;
uniform vec3 uDayBottomColor;
uniform vec3 uNightTopColor;
uniform vec3 uNightBottomColor;

varying vec2 vUv;
varying vec3 vPosition;

// --- 工具函数：伪随机数生成器 (用于星星) ---
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// --- 工具函数：2D 噪声 (用于云) ---
// 这是一个轻量级的噪声函数，适合移动端
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

// --- 工具函数：FBM (分形布朗运动) ---
// 叠加多层噪声以产生云的絮状纹理
#define OCTAVES 4
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    
    // 循环叠加，移动端注意控制 OCTAVES 数量
    for (int i = 0; i < OCTAVES; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}


void main() {
    // 1. 基础渐变背景计算
    float gradientFactor = smoothstep(0.0, 1.0, vUv.y);
    
    vec3 dayGradient = mix(uDayBottomColor, uDayTopColor, gradientFactor);
    vec3 nightGradient = mix(uNightBottomColor, uNightTopColor, gradientFactor);
    
    // 2. 白天：流动的云
    vec2 cloudUv = vUv * 3.0 + vec2(uTime * 0.05, 0.0); 
    float cloudDensity = fbm(cloudUv);
    float cloudMask = smoothstep(0.4, 0.8, cloudDensity); 
    vec3 dayState = mix(dayGradient, vec3(1.0), cloudMask * 0.8);

    // ===== Night Sky + Aurora =====
    
    // 使用方向向量映射天空
    vec3 dir = normalize(vPosition);
    vec2 uv = dir.xy;
    
    float skyGrad = smoothstep(-0.2, 0.8, dir.y);
    
    vec3 nightSky = mix(
      vec3(0.01, 0.02, 0.05),   // 接近黑
      vec3(0.02, 0.06, 0.08),   // 深蓝绿
      skyGrad
    );
    
    vec2 auroraUv = vec2(uv.x * 2.0, dir.y);
    
    // 基础垂直衰减（只在天空上半部分）
    float heightMask = smoothstep(-0.1, 0.6, dir.y);
    
    // 横向流动（多频率叠加）
    float flow =
      sin(auroraUv.x * 2.0 + uTime * 0.15) +
      sin(auroraUv.x * 4.5 - uTime * 0.1) * 0.5;
    
    // 纵向扰动（让光幕“撕裂”）
    float verticalNoise =
      sin(dir.y * 12.0 + uTime * 0.8 + flow);
    
    // 极光主体强度
    float auroraBase =
      smoothstep(-0.3, 0.6, flow + verticalNoise * 0.3 + dir.y * 1.3) *
      heightMask;
    
    // 下层：亮绿
    vec3 auroraLow =
      vec3(0.2, 0.95, 0.55) *
      auroraBase *
      smoothstep(-0.2, 0.2, dir.y);
    
    // 中层：青绿
    vec3 auroraMid =
      vec3(0.2, 0.7, 0.8) *
      auroraBase *
      smoothstep(0.0, 0.45, dir.y);
    
    // 上层：蓝紫
    vec3 auroraHigh =
      vec3(0.35, 0.4, 0.9) *
      auroraBase *
      smoothstep(0.25, 0.7, dir.y);
    
    // 动态呼吸亮度
    float pulse = 0.6 + 0.4 * sin(uTime * 0.6);
    
    // 最终极光颜色
    vec3 auroraColor = (auroraLow + auroraMid + auroraHigh) * pulse * 0.7;
    
    float stars = 0.0;
    
    // 将天空划分为网格
    vec2 starUv = uv * 120.0;
    vec2 id = floor(starUv);
    vec2 gv = fract(starUv) - 0.5;
    
    // hash
    float rnd = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
    
    // 只保留很少的星
    if (rnd > 0.985) {
      float d = length(gv);
      float size = mix(0.02, 0.06, fract(rnd * 10.0));
      float intensity = smoothstep(size, 0.0, d);
    
      // 轻微闪烁
      intensity *= 0.6 + 0.4 * sin(uTime + rnd * 10.0);
    
      stars += intensity;
    }
    
    // 星星颜色（略偏冷白）
    vec3 starColor = vec3(1.0) * stars;
    
    vec3 nightState = nightSky + auroraColor + starColor;

    // 4. 最终混合：根据 uDark 参数混合白天和黑夜
    vec3 finalColor = mix(dayState, nightState, uDark);

    gl_FragColor = vec4(finalColor, 1.0);
    
    // 颜色空间校正
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`

export function SkyGradientBackground({ dark }: Props) {
  const mesh = useRef<THREE.Mesh>(null);

  // 使用 useMemo 缓存 Uniforms，避免每帧重新创建对象
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDark: { value: dark ? 1.0 : 0.0 },
      // 白天颜色配置
      uDayTopColor: { value: new THREE.Color('#003a99') },
      uDayBottomColor: { value: new THREE.Color('#6fb7e6') },
      // 夜晚颜色配置
      uNightTopColor: { value: new THREE.Color('#000000') }, // 纯黑
      uNightBottomColor: { value: new THREE.Color('#1a1a2e') }, // 深夜蓝紫
    }),
    []
  );

  // 监听 dark 属性变化，平滑过渡
  useEffect(() => {
  }, [dark]);

  useFrame((state, delta) => {
    if (mesh.current) {
      const material = mesh.current.material as THREE.ShaderMaterial;

      // 1. 更新时间 (用于云流动和星星闪烁)
      material.uniforms.uTime.value += delta;

      // 2. 平滑过渡白天/黑夜 (Lerp)
      // 目标值: dark 为 true 时是 1.0，否则是 0.0
      const targetDark = dark ? 1.0 : 0.0;
      const currentDark = material.uniforms.uDark.value;

      // 0.05 是平滑系数，值越小过渡越慢
      material.uniforms.uDark.value = THREE.MathUtils.lerp(currentDark, targetDark, 2.0 * delta);
    }
  });

  return (
    // 创建一个巨大的球体包裹场景
    // args: [半径, 宽度分段, 高度分段]
    // 半径设为 1000 确保它在所有物体后面
    <mesh ref={mesh} scale={[1000, 1000, 1000]}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide} // 关键：渲染球体内表面
        depthWrite={false}    // 关键：不写入深度缓冲，确保它永远作为背景
      />
    </mesh>
  );
}
