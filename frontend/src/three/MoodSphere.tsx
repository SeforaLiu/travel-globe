import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTravelStore } from '@/store/useTravelStore';
import { Perf } from "r3f-perf";

// ==========================================
// CONFIG: 在这里调整粒子的大小、颜色和动画参数
// ==========================================
const CONFIG = {
  sphereRadius: 1.8,          // 球体整体半径
  minParticles: 200,          // 初始球体最少粒子数 (如果没有心情，也会显示这么多)

  // --- 基础粒子 (未被心情覆盖的) ---
  baseParticle: {
    color: '#ffffff',         // 基础颜色
    opacity: 0.15,            // 透明度 (半透明)
    sizeMin: 0.01,            // 随机大小最小值
    sizeMax: 0.04,            // 随机大小最大值
  },

  // --- 心情粒子 ---
  moodParticle: {
    baseSize: 0.02,           // 基础大小
    sizeFactor: 0.03,         // 大小随 mood_vector 增加的系数
    roughness: 0.1,           // 材质粗糙度
  },

  // --- 呼吸动画 ---
  breathing: {
    speed: 1.8,               // 呼吸速度
    scaleRange: 0.12,         // 缩放幅度 (1.0 +/- 0.15)
    lightnessRange: 0.1,      // 颜色亮度变化幅度 (变大时变亮)
  },

  // --- 颜色算法配置 ---
  colors: {
    // 低 mood_vector (0.0) 的颜色: 深邃的蓝紫色
    low: { h: 0.65, s: 0.9, l: 0.15 },
    // 高 mood_vector (1.0) 的颜色: 鲜艳的橙红色
    high: { h: 0.08, s: 1.0, l: 0.6 },
  }
};

// 斐波那契球体算法：在球面上均匀分布点
const getFibonacciSpherePoints = (samples: number, radius: number) => {
  const points = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角

  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2; // y 从 1 到 -1
    const radiusAtY = Math.sqrt(1 - y * y); // 当前 y 高度下的半径
    const theta = phi * i; // 黄金角增量

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
  // 引用 InstancedMesh，用于直接操作 GPU 实例
  const moodMeshRef = useRef<THREE.InstancedMesh>(null);
  const baseMeshRef = useRef<THREE.InstancedMesh>(null);

  const moods = useTravelStore(state => state.moods);
  const fetchMoods = useTravelStore(state => state.fetchMoods);

  // 初始化加载数据
  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  // 1. 计算总粒子数和点位
  // 逻辑：如果心情数量超过200，球体就由心情数量决定；否则保持200个点
  const totalCount = Math.max(CONFIG.minParticles, moods.length);

  // 2. 生成球体点位数据
  const { positions, randomIndices } = useMemo(() => {
    const points = getFibonacciSpherePoints(totalCount, CONFIG.sphereRadius);

    // 生成一个随机索引数组，用于打乱心情在球体上的分布
    // 这样心情就不会只集中在球体的"北极"
    const indices = Array.from({ length: totalCount }, (_, i) => i);
    // 使用简单的洗牌算法
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i * 123.45) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    return { positions: points, randomIndices: indices };
  }, [totalCount]);

  // 3. 准备临时对象用于矩阵计算 (避免在循环中创建新对象)
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // 4. 动画循环：处理自转和呼吸效果
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // A. 整体自转
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03;
    }

    // B. 心情粒子呼吸效果 (性能优化重点)
    if (moodMeshRef.current && moods.length > 0) {
      let needsUpdate = false;

      moods.forEach((mood, i) => {
        // 获取该心情对应的随机位置索引
        const slotIndex = randomIndices[i];
        const pos = positions[slotIndex];

        // --- 呼吸计算 ---
        // 使用 sin 函数创造呼吸韵律，每个粒子加上 i 做相位偏移，让它们不同步
        const breath = Math.sin(time * CONFIG.breathing.speed + i * 10);

        // 1. 大小变化: 变大
        const baseSize = CONFIG.moodParticle.baseSize + (mood.mood_vector * CONFIG.moodParticle.sizeFactor);
        // 缩放系数: 在 1.0 基础上波动
        const scaleFactor = 1 + breath * CONFIG.breathing.scaleRange;
        const currentSize = baseSize * scaleFactor;

        dummy.position.copy(pos);
        dummy.scale.set(currentSize, currentSize, currentSize);
        dummy.updateMatrix();

        // 更新矩阵 (位置+大小)
        moodMeshRef.current!.setMatrixAt(i, dummy.matrix);

        // 2. 颜色变化: 变大时变浅(亮)，变小时变深
        // 基础颜色计算
        let h, s, l;
        if (mood.mood_vector < 0.5) {
          // 负面/低能量 -> 向深色过渡
          // 插值计算
          const t = mood.mood_vector * 2; // 0~1
          h = CONFIG.colors.low.h;
          s = CONFIG.colors.low.s;
          l = CONFIG.colors.low.l + t * 0.1; // 稍微亮一点点
        } else {
          // 正面/高能量 -> 向橙色过渡
          const t = (mood.mood_vector - 0.5) * 2; // 0~1
          // 简单的线性插值
          h = THREE.MathUtils.lerp(CONFIG.colors.low.h, CONFIG.colors.high.h, t);
          // 如果跨度大，直接用 high 也可以，这里做个平滑过渡
          if(t > 0.5) h = CONFIG.colors.high.h;

          s = THREE.MathUtils.lerp(CONFIG.colors.low.s, CONFIG.colors.high.s, t);
          l = THREE.MathUtils.lerp(CONFIG.colors.low.l, CONFIG.colors.high.l, t);
        }

        // 叠加呼吸亮度
        // breath 是 -1 到 1。变大(1)时更亮，变小(-1)时更暗
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

  // 5. 初始化/更新 静态的基础粒子 (Base Particles)
  // 这些粒子不需要每帧更新，只需要在组件挂载或数量变化时设置一次
  useEffect(() => {
    if (!baseMeshRef.current) return;

    // 基础粒子数量 = 总位置数 - 心情数量
    // 我们从 positions 数组的末尾开始取位置给基础粒子
    let baseIndex = 0;

    // 遍历所有的槽位
    for (let i = 0; i < totalCount; i++) {
      // 如果这个槽位(randomIndices[i]) 已经被心情(i < moods.length)占用了，就跳过
      // 注意：这里逻辑是，前 moods.length 个随机索引分配给了心情
      // 剩下的分配给 Base
      if (i < moods.length) continue;

      const slotIndex = randomIndices[i];
      const pos = positions[slotIndex];

      // 随机大小
      const size = CONFIG.baseParticle.sizeMin + Math.random() * (CONFIG.baseParticle.sizeMax - CONFIG.baseParticle.sizeMin);

      dummy.position.copy(pos);
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();

      baseMeshRef.current.setMatrixAt(baseIndex, dummy.matrix);

      // 颜色固定
      colorHelper.set(CONFIG.baseParticle.color);
      baseMeshRef.current.setColorAt(baseIndex, colorHelper);

      baseIndex++;
    }

    baseMeshRef.current.instanceMatrix.needsUpdate = true;
    if (baseMeshRef.current.instanceColor) baseMeshRef.current.instanceColor.needsUpdate = true;

  }, [totalCount, moods.length, positions, randomIndices, dummy, colorHelper]);


  return (
    <group ref={groupRef} scale={1.5}>

      {/*
        1. 心情粒子层 (InstancedMesh)
        - 数量: moods.length
        - 材质: 不透明/发光，颜色鲜艳
      */}
      {moods.length > 0 && (
        <instancedMesh
          ref={moodMeshRef}
          args={[undefined, undefined, moods.length]}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            roughness={CONFIG.moodParticle.roughness}
            emissiveIntensity={0.2} // 自发光强度
          />
        </instancedMesh>
      )}

      {/*
        2. 基础底座粒子层 (InstancedMesh)
        - 数量: 总数 - 心情数
        - 材质: 半透明，作为背景
      */}
      <instancedMesh
        ref={baseMeshRef}
        args={[undefined, undefined, Math.max(0, totalCount - moods.length)]}
      >
        <sphereGeometry args={[1, 12, 12]} /> {/* 精度可以低一点 */}
        <meshStandardMaterial
          color={CONFIG.baseParticle.color}
          transparent
          opacity={CONFIG.baseParticle.opacity}
          roughness={0.8}
        />
      </instancedMesh>

    </group>
  );
}
