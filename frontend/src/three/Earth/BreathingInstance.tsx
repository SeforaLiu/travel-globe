// src/three/Earth/BreathingInstance.tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance } from '@react-three/drei';
import * as THREE from 'three';

type BreathingInstanceProps = {
  position: THREE.Vector3;
  baseScale: number;
  baseColor: string;
  isHighlighted: boolean; // 对应 hovered 或 selected
  onClick: (e: any) => void;
  onPointerEnter: (e: any) => void;
  onPointerLeave: () => void;
};

const tempColor = new THREE.Color();
const targetColor = new THREE.Color();

export const BreathingInstance = React.memo(({
                                               position,
                                               baseScale,
                                               baseColor,
                                               isHighlighted,
                                               onClick,
                                               onPointerEnter,
                                               onPointerLeave
                                             }: BreathingInstanceProps) => {
  const ref = useRef<any>(null);

  // 1. 性能优化：生成一个随机偏移量，让每个点的呼吸节奏不一样
  // 范围 0 ~ 100
  const randomOffset = useMemo(() => Math.random() * 100, []);

  // 2. 缓存基础颜色对象，避免每帧创建新对象
  const colorObj = useMemo(() => new THREE.Color(baseColor), [baseColor]);

  useFrame((state) => {
    if (!ref.current) return;

    // 如果被高亮（Hover或Selected），停止呼吸，锁定为高亮状态
    if (isHighlighted) {
      // 平滑过渡回正常大小（可选，这里直接设置为了响应速度）
      ref.current.scale.setScalar(baseScale);
      ref.current.color.set(baseColor); // 恢复由父组件传入的高亮颜色
      return;
    }

    // === 呼吸算法 ===
    const time = state.clock.elapsedTime * 0.85;
    // 使用 sin 函数生成 -1 到 1 的波形，加上 randomOffset 错开时间
    // (Math.sin(...) + 1) / 2 将范围转换到 0 ~ 1
    const breatheFactor = (Math.sin((time * 2) + randomOffset) + 1) / 2;

    // 1. 缩放计算: 在 baseScale 基础上波动
    const currentScale = baseScale * (1 + breatheFactor * 0.15);
    ref.current.scale.setScalar(currentScale);

    // 2. 颜色计算:
    // 注意：这里我们不修改材质，而是修改 Instance 的 color 属性
    targetColor.copy(colorObj).lerp(new THREE.Color('#ff6467'), breatheFactor * 0.5);
    ref.current.color.copy(targetColor);
  });

  return (
    <Instance
      ref={ref}
      position={position}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // 初始值
      scale={baseScale}
      color={baseColor}
    />
  );
});
