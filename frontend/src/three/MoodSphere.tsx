// MoodSphere.tsx
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useTravelStore } from '@/store/useTravelStore';
import DiscoBall from '@/three/DiscoBall';
import useDebouncedCallback from "@/hooks/useDebouncedCallback";

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
  if (samples <= 1) {
    // 如果只有一个点，直接放在球体顶部，避免除以零的错误
    return [new THREE.Vector3(0, radius, 0)];
  }

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
  const discoBallGroupRef = useRef<THREE.Group>(null)

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

    if(activeMoodData){
      setShowMoodModal(true)
      return
    }

    // 设置全局的 activeMoodData
    const clickedMood = moods[id];
    if (clickedMood) {
      setActiveMoodData(clickedMood);
    }
  };

  /** 点击背景 / 球体其它地方 */
  const handleBackgroundClick = useDebouncedCallback(() => {
    if (showMoodModal) return;
    setActiveMoodData(null);
  }, 300)

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMoodModal(true);
  };

  const activePosition =
    activeInstanceId !== null
      ? positions[randomIndices[activeInstanceId]]
      : null;

  // 5. 更新渲染逻辑，使用 store 中的状态
  return (
    <group ref={groupRef} scale={isMobile? 1.2 : 1.5} onPointerMissed={handleBackgroundClick}>
      <DiscoBall
        scale={0.8}
        moodVector={avgMoodVector}
        colorLow={CONFIG.colors.low}
        colorHigh={CONFIG.colors.high}
        handleBackgroundClick={handleBackgroundClick}
        discoBallGroupRef={discoBallGroupRef}
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

      {activePosition && activeMoodData && !showMoodModal && (
        <group  position={activePosition}>
          <Html
            position={[0, 0.1, 0]}
            center
            distanceFactor={8}
            scale={2}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[30, 0]}
          >
            <div
              onClick={handleLabelClick}
              style={{ pointerEvents: 'auto' }}
              className="text-white text-xs px-2 py-1 rounded whitespace-nowrap cursor-pointer bg-black/70"
            >
              {truncateText(activeMoodData.content)}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
