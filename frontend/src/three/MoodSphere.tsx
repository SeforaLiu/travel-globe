import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useTravelStore } from '@/store/useTravelStore';
import {Perf} from "r3f-perf";

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

export function MoodSphere() {
  const groupRef = useRef<THREE.Group>(null);
  const moods = useTravelStore(state => state.moods);
  const fetchMoods = useTravelStore(state => state.fetchMoods);

  // 初始化加载数据
  useEffect(() => {
    fetchMoods();
  }, [fetchMoods]);

  // 计算所有粒子的数据
  const particles = useMemo(() => {
    if (!moods.length) return [];

    // 后端返回的是倒序(新->旧)，我们反转为正序(旧->新)来计算位置和连线
    // 这样连线代表了时间的流逝
    const sortedMoods = [...moods].reverse();
    const count = sortedMoods.length;
    const radius = 1.8; // 球体半径

    // 获取均匀分布的坐标
    const positions = getFibonacciSpherePoints(count, radius);

    return sortedMoods.map((mood, i) => {
      const pos = positions[i];

      // 颜色计算: 0.0(蓝/冷) -> 0.5(白/灰) -> 1.0(橙/暖)
      const color = new THREE.Color();
      if (mood.mood_vector < 0.5) {
        // 消极：蓝色系 (0.0 -> DeepBlue, 0.5 -> White)
        color.setHSL(0.6, 0.8, 0.2 + mood.mood_vector * 1.2);
      } else {
        // 积极：橙黄色系 (0.5 -> White, 1.0 -> Orange)
        color.setHSL(0.08, 0.9, 0.5 + (mood.mood_vector - 0.5));
      }

      // 大小计算: 积极的更大
      const size = 0.05 + (mood.mood_vector * 0.08);
      return {
        ...mood,
        position: pos,
        color: color,
        size: size
      };
    });
  }, [moods]);

  // 连线路径点
  const linePoints = useMemo(() => {
    console.log(particles)
    return particles.map(p => p.position);
  }, [particles]);

  // 旋转动画
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05; // 缓慢自转
    }
  });

  if (particles.length === 0) return null;

  return (
    <group ref={groupRef}>
      <Perf position="top-left" />

      {/* 1. 连线 (网状结构) */}
      <Line
        points={linePoints}
        color="white"
        opacity={0.15}
        transparent
        lineWidth={1}
      />

      {/* 2. 粒子渲染 */}
      {particles.map((p, i) => (
        <group key={p.id} position={p.position}>
          <mesh>
            <sphereGeometry args={[p.size, 16, 16]} />
            <meshStandardMaterial
              color={p.color}
              // emissive={p.color}
              // emissiveIntensity={0.5}
              roughness={0.2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
