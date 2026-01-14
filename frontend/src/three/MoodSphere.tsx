import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { useTravelStore } from '@/store/useTravelStore';
import { Environment, useTexture } from '@react-three/drei';
import DiscoBall from "@/three/DiscoBall";
import {Perf} from "r3f-perf";

// ==========================================
// CONFIG: 在这里调整粒子和迪斯科球的参数
// ==========================================
const CONFIG = {
  // 心情粒子现在会围绕迪斯科球，所以半径要比迪斯科球大
  moodSphereRadius: 1.9,

  // --- 迪斯科球 ---
  discoBall: {
    radius: 1.8,              // 迪斯科球的半径
    metalness: 1.0,           // 金属度 (1.0 = 纯金属)
    roughness: 0.1,           // 粗糙度 (0.0 = 完美镜面, 0.1 稍微模糊一点更真实)
  },

  // --- 心情粒子 ---
  moodParticle: {
    baseSize: 0.02,
    sizeFactor: 0.03,
    roughness: 0.1,
  },

  // --- 呼吸动画 ---
  breathing: {
    speed: 1.8,
    scaleRange: 0.12,
    lightnessRange: 0.1,
  },

  // --- 颜色算法配置 ---
  colors: {
    low: { h: 0.65, s: 0.9, l: 0.15 },
    high: { h: 0.08, s: 1.0, l: 0.6 },
  }
};

// 斐波那契球体算法：在球面上均匀分布点
const getFibonacciSpherePoints = (samples: number, radius: number) => {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
};

// 简单的伪随机数生成器 (为了保证每次刷新位置相对固定，不闪烁)
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export function MoodSphere() {
  const groupRef = useRef<THREE.Group>(null);
  const moodMeshRef = useRef<THREE.InstancedMesh>(null);

  const moods = useTravelStore(state => state.moods);
  const fetchMoods = useTravelStore(state => state.fetchMoods);

  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  // 心情粒子的总数由 moods.length 决定
  const totalCount = moods.length;

  // 生成心情粒子的球体点位数据
  const { positions, randomIndices } = useMemo(() => {
    // 注意：这里的半径现在是 moodSphereRadius，让粒子在迪斯科球外部
    const points = getFibonacciSpherePoints(totalCount, CONFIG.moodSphereRadius);

    const indices = Array.from({ length: totalCount }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i * 123.45) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return { positions: points, randomIndices: indices };
  }, [totalCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2; // 让整体旋转稍微快一点，更有动感
      groupRef.current.rotation.x += delta * 0.05;
    }

    if (moodMeshRef.current && moods.length > 0) {
      let needsUpdate = false;

      moods.forEach((mood, i) => {
        const slotIndex = randomIndices[i];
        const pos = positions[slotIndex];

        const breath = Math.sin(time * CONFIG.breathing.speed + i * 10);

        const baseSize = CONFIG.moodParticle.baseSize + (mood.mood_vector * CONFIG.moodParticle.sizeFactor);
        const scaleFactor = 1 + breath * CONFIG.breathing.scaleRange;
        const currentSize = baseSize * scaleFactor;

        dummy.position.copy(pos);
        dummy.scale.set(currentSize, currentSize, currentSize);
        dummy.updateMatrix();

        moodMeshRef.current!.setMatrixAt(i, dummy.matrix);

        let h, s, l;
        if (mood.mood_vector < 0.5) {
          const t = mood.mood_vector * 2;
          h = CONFIG.colors.low.h;
          s = CONFIG.colors.low.s;
          l = CONFIG.colors.low.l + t * 0.1;
        } else {
          const t = (mood.mood_vector - 0.5) * 2;
          h = THREE.MathUtils.lerp(CONFIG.colors.low.h, CONFIG.colors.high.h, t);
          if(t > 0.5) h = CONFIG.colors.high.h;
          s = THREE.MathUtils.lerp(CONFIG.colors.low.s, CONFIG.colors.high.s, t);
          l = THREE.MathUtils.lerp(CONFIG.colors.low.l, CONFIG.colors.high.l, t);
        }

        const breathingLightness = l + (breath * CONFIG.breathing.lightnessRange);
        colorHelper.setHSL(h, s, Math.max(0, Math.min(1, breathingLightness)));
        moodMeshRef.current!.setColorAt(i, colorHelper);

        needsUpdate = true;
      });

      if (needsUpdate) {
        moodMeshRef.current.instanceMatrix.needsUpdate = true;
        if (moodMeshRef.current.instanceColor) moodMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  // 删除了原来用于计算基础粒子的 useEffect，因为它不再需要了。

  return (
    <group ref={groupRef} scale={1.5}>
      <rectAreaLight
        width={5}
        height={4}
        intensity={1.7}
        position={[-0.5,2,2.7]}
        rotation={[-1.5,-0.8,-0.8]}
        color='#a09cb4'
      />
      
      {/*
        1. 迪斯科球核心 (替换了原来的基础粒子层)
        - 这是一个单一的 Mesh，而不是 InstancedMesh
        - 使用了带有法线贴图的金属材质来实现效果
      */}
      <DiscoBall scale={0.8} />

      {/*
        2. 心情粒子层 (InstancedMesh)
        - 逻辑保持不变，它们现在会围绕着中心的迪斯科球
      */}
      {moods.length > 0 && (
        <instancedMesh
          ref={moodMeshRef}
          args={[undefined, undefined, moods.length]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            roughness={CONFIG.moodParticle.roughness}
            emissiveIntensity={0.2}
          />
        </instancedMesh>
      )}
    </group>
  );
}
