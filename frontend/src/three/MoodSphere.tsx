// MoodSphere.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useTravelStore } from '@/store/useTravelStore';
import DiscoBall from '@/three/DiscoBall';

type Mood = {
  id: number;
  content: string;
  photo_url: string | null;
  created_at: string;
  mood_vector: number;
  mood_reason?: string;
  photo_public_id?: string | null;
};

type Props = {
  isMobile?: boolean;
  dark: boolean;
};

const CONFIG = {
  moodSphereRadius: 1.9,
  moodParticle: {
    baseSize: 0.02,
    sizeFactor: 0.03,
    roughness: 0.1,
  },
  breathing: {
    speed: 1.8,
    scaleRange: 0.12,
    lightnessRange: 0.1,
  },
  colors: {
    low: { h: 0.65, s: 0.9, l: 0.15 },
    high: { h: 0.08, s: 1.0, l: 0.6 },
  },
};

const getHSLFromVector = (vector: number) => {
  let h, s, l;
  if (vector < 0.5) {
    const t = vector * 2;
    h = CONFIG.colors.low.h;
    s = CONFIG.colors.low.s;
    l = CONFIG.colors.low.l + t * 0.1;
  } else {
    const t = (vector - 0.5) * 2;
    h = THREE.MathUtils.lerp(CONFIG.colors.low.h, CONFIG.colors.high.h, t);
    if (t > 0.5) h = CONFIG.colors.high.h;
    s = THREE.MathUtils.lerp(CONFIG.colors.low.s, CONFIG.colors.high.s, t);
    l = THREE.MathUtils.lerp(CONFIG.colors.low.l, CONFIG.colors.high.l, t);
  }
  return { h, s, l };
};

const getFibonacciSpherePoints = (samples: number, radius: number) => {
  const points: THREE.Vector3[] = [];
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

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const truncateText = (text: string, limit = 30) =>
  text.length > limit ? text.slice(0, limit) + '...' : text;


export function MoodSphere({ isMobile = false, dark }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const moodMeshRef = useRef<THREE.InstancedMesh>(null);

  const moods = useTravelStore(state => state.moods)
  const showMoodModal = useTravelStore(state => state.showMoodModal)
  const activeMoodData = useTravelStore(state => state.activeMoodData)
  const setShowMoodModal = useTravelStore(state => state.setShowMoodModal)
  const setActiveMoodData = useTravelStore(state => state.setActiveMoodData)

  const totalCount = moods.length;
  const isPausedRef = useRef(false);

  const { positions, randomIndices } = useMemo(() => {
    if (!totalCount) return { positions: [], randomIndices: [] };
    const points = getFibonacciSpherePoints(totalCount, CONFIG.moodSphereRadius);
    const indices = [...Array(totalCount).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i * 123.45) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return { positions: points, randomIndices: indices };
  }, [totalCount]);

  // 3. [核心改进] activeInstanceId 现在从全局 activeMoodData 派生而来
  // 这确保了 store 是唯一的数据源。
  const activeInstanceId = useMemo(() => {
    if (!activeMoodData) return null;
    const index = moods.findIndex(m => m.id === activeMoodData.id);
    return index !== -1 ? index : null;
  }, [activeMoodData, moods]);


  const avgMoodVector = useMemo(() => {
    if (!totalCount) return 0.5;
    return moods.reduce((s, m) => s + m.mood_vector, 0) / totalCount;
  }, [moods, totalCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    // 当有粒子被选中或模态框打开时，暂停旋转
    isPausedRef.current = activeInstanceId !== null || showMoodModal;

    const time = state.clock.getElapsedTime();

    if (groupRef.current && !isPausedRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }

    if (!moodMeshRef.current) return;

    moods.forEach((mood, i) => {
      const pos = positions[randomIndices[i]];
      const breath = Math.sin(time * CONFIG.breathing.speed + i * 10);
      const baseSize =
        CONFIG.moodParticle.baseSize +
        mood.mood_vector * CONFIG.moodParticle.sizeFactor;

      const isActive = i === activeInstanceId;
      const scale =
        baseSize *
        (1 + breath * CONFIG.breathing.scaleRange) *
        (isActive ? 1.5 : 1);

      dummy.position.copy(pos);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      moodMeshRef.current!.setMatrixAt(i, dummy.matrix);

      if (isActive) {
        colorHelper.set('#ff3b3b');
      } else {
        const { h, s, l } = getHSLFromVector(mood.mood_vector);
        colorHelper.setHSL(
          h,
          s,
          THREE.MathUtils.clamp(l + breath * CONFIG.breathing.lightnessRange, 0, 1),
        );
      }

      moodMeshRef.current!.setColorAt(i, colorHelper);
    });

    moodMeshRef.current.instanceMatrix.needsUpdate = true;
    moodMeshRef.current.instanceColor!.needsUpdate = true;
  });

  // 4. 更新事件处理器，使其调用 store actions
  /** 点击粒子 */
  const handleClick = (e: any) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined) return;

    // 设置全局的 activeMoodData
    const clickedMood = moods[id];
    if (clickedMood) {
      setActiveMoodData(clickedMood);
    }
  };

  /** 点击背景 / 球体其它地方 */
  const handleBackgroundClick = () => {
    if (showMoodModal) return; // 如果模态框开着，点击背景不应有任何反应
    // 清除全局的 activeMoodData，这将自动取消高亮
    setActiveMoodData(null);
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 打开模态框
    setShowMoodModal(true);
  };

  const activePosition =
    activeInstanceId !== null
      ? positions[randomIndices[activeInstanceId]]
      : null;

  // 5. 更新渲染逻辑，使用 store 中的状态
  return (
    <group ref={groupRef} scale={1.5} onPointerMissed={handleBackgroundClick}>
      <DiscoBall
        scale={0.8}
        moodVector={avgMoodVector}
        colorLow={CONFIG.colors.low}
        colorHigh={CONFIG.colors.high}
      />

      {totalCount > 0 && (
        <instancedMesh
          ref={moodMeshRef}
          args={[undefined, undefined, totalCount]}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial roughness={CONFIG.moodParticle.roughness} />
        </instancedMesh>
      )}

      {/* 当有 activeMoodData 且模态框未显示时，才显示标签 */}
      {activePosition && activeMoodData && !showMoodModal && (
        <Html center position={activePosition} distanceFactor={10}>
          <div
            onClick={handleLabelClick}
            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border backdrop-blur-sm ${
              dark
                ? 'bg-black/80 text-white border-white/20'
                : 'bg-white/90 text-gray-900 border-gray-200 shadow-sm'
            }`}
          >
            {truncateText(activeMoodData.content)}
          </div>
        </Html>
      )}
    </group>
  );
}
