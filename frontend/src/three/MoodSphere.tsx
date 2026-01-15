// MoodSphere.tsx
import React, {useMemo, useRef, useState, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {Html, Center, Text3D} from '@react-three/drei';
import {useTravelStore} from '@/store/useTravelStore';
import DiscoBall from "@/three/DiscoBall";
import MoodDetailModal from '@/components/MoodDetailModal'; // 引入新组件

// --- 类型定义 ---
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
  dark: boolean; // 新增 dark 属性
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
    low: {h: 0.65, s: 0.9, l: 0.15},
    high: {h: 0.08, s: 1.0, l: 0.6},
  }
};

// --- 辅助函数 ---
const getFibonacciSpherePoints = (samples: number, radius: number) => {
  // ... (代码无变化)
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

const seededRandom = (seed: number) => {
  // ... (代码无变化)
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const truncateText = (text: string, limit: number = 30) => {
  // ... (代码无变化)
  if (!text) return '';
  return text.length > limit ? text.slice(0, limit) + '...' : text;
};

export function MoodSphere({isMobile = false, dark}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const moodMeshRef = useRef<THREE.InstancedMesh>(null);
  const lightColor = '#5136d5';

  const moods = useTravelStore(state => state.moods) as Mood[];
  const totalCount = moods.length;

  // --- 状态管理 ---
  const [activeInstanceId, setActiveInstanceId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isPausedRef = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- 数据准备 ---
  const {positions, randomIndices} = useMemo(() => {
    // 当 totalCount 为 0 时，避免 getFibonacciSpherePoints 报错
    if (totalCount === 0) {
      return { positions: [], randomIndices: [] };
    }
    const points = getFibonacciSpherePoints(totalCount, CONFIG.moodSphereRadius);
    const indices = Array.from({length: totalCount}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom(i * 123.45) * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return {positions: points, randomIndices: indices};
  }, [totalCount]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorHelper = useMemo(() => new THREE.Color(), []);

  // --- 动画循环 ---
  useFrame((state, delta) => {
    // ... (代码无变化)
    const time = state.clock.getElapsedTime();

    if (groupRef.current && !isPausedRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
    }

    if (moodMeshRef.current && moods.length > 0) {
      let needsUpdate = false;

      moods.forEach((mood, i) => {
        const slotIndex = randomIndices[i];
        const pos = positions[slotIndex];

        const breath = Math.sin(time * CONFIG.breathing.speed + i * 10);
        const baseSize = CONFIG.moodParticle.baseSize + (mood.mood_vector * CONFIG.moodParticle.sizeFactor);

        const isActive = i === activeInstanceId;
        const highlightScale = isActive ? 1.5 : 1;

        const scaleFactor = (1 + breath * CONFIG.breathing.scaleRange) * highlightScale;
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
          if (t > 0.5) h = CONFIG.colors.high.h;
          s = THREE.MathUtils.lerp(CONFIG.colors.low.s, CONFIG.colors.high.s, t);
          l = THREE.MathUtils.lerp(CONFIG.colors.low.l, CONFIG.colors.high.l, t);
        }

        const breathingLightness = l + (breath * CONFIG.breathing.lightnessRange);

        if (isActive) {
          colorHelper.set('#ffffff');
        } else {
          colorHelper.setHSL(h, s, Math.max(0, Math.min(1, breathingLightness)));
        }

        moodMeshRef.current!.setColorAt(i, colorHelper);
        needsUpdate = true;
      });

      if (needsUpdate) {
        moodMeshRef.current.instanceMatrix.needsUpdate = true;
        if (moodMeshRef.current.instanceColor) moodMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  // --- 交互处理 ---
  const pauseRotation = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    isPausedRef.current = true;
  };

  const resumeRotation = (delay = 1000) => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (!showModal) {
        isPausedRef.current = false;
      }
    }, delay);
  };

  const handlePointerOver = (e: any) => {
    if (isMobile || showModal) return;
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined) {
      setActiveInstanceId(instanceId);
      pauseRotation();
    }
  };

  const handlePointerOut = (e: any) => {
    if (isMobile || showModal) return;
    setActiveInstanceId(null);
    resumeRotation(1500);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;

    if (instanceId === undefined) return;

    if (isMobile) {
      if (activeInstanceId === instanceId) {
        setShowModal(true);
        pauseRotation();
      } else {
        setActiveInstanceId(instanceId);
        pauseRotation();
      }
    }
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
    pauseRotation();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveInstanceId(null);
    isPausedRef.current = false;
  };

  const activePosition = useMemo(() => {
    if (activeInstanceId === null) return null;
    const slotIndex = randomIndices[activeInstanceId];
    return positions[slotIndex];
  }, [activeInstanceId, positions, randomIndices]);

  const activeMoodData = activeInstanceId !== null ? moods[activeInstanceId] : null;

  return (
    <group ref={groupRef} scale={1.5}>
      <rectAreaLight
        width={5}
        height={4}
        intensity={1.7}
        position={[-0.5, 2, 2.7]}
        rotation={[-1.5, -0.8, -0.8]}
        color={lightColor}
      />

      <DiscoBall scale={0.8}/>

      {/*/!* --- 新增：空状态提示 --- *!/*/}
      {/*{totalCount === 0 && (*/}
      {/*  <Html*/}
      {/*    position={[0, 2, 0]} // 定位在 DiscoBall 下方*/}
      {/*    center*/}
      {/*    zIndexRange={[10, 0]}*/}
      {/*  >*/}
      {/*    <div*/}
      {/*      className={`*/}
      {/*        w-64 text-center select-none*/}
      {/*        text-sm md:text-base font-medium*/}
      {/*        transition-colors duration-300*/}
      {/*        animate-subtle-pulse*/}
      {/*        ${dark ? 'text-red-300' : 'text-purple-600'}*/}
      {/*      `}*/}
      {/*      style={{ pointerEvents: 'none' }} // 确保不阻挡鼠标事件*/}
      {/*    >*/}
      {/*      开始创建心情，点亮你的 Disco Ball 吧！*/}
      {/*    </div>*/}
      {/*  </Html>*/}

      {/*  // <Center>*/}
      {/*  //   <Text3D*/}
      {/*  //     font="./fonts/helvetiker_regular.typeface.json"*/}
      {/*  //     size={0.65}*/}
      {/*  //     height={0.2}*/}
      {/*  //     curveSegments={12}*/}
      {/*  //     bevelEnabled*/}
      {/*  //     bevelThickness={0.02}*/}
      {/*  //     bevelSize={0.02}*/}
      {/*  //     bevelOffset={0}*/}
      {/*  //     bevelSegments={5}*/}
      {/*  //     position={[-2,-4.6,0]}*/}
      {/*  //   >*/}
      {/*  //     Hello Carol*/}
      {/*  //   </Text3D>*/}
      {/*  // </Center>*/}
      {/*)}*/}

      {/* 当有 moods 时才渲染 instancedMesh */}
      {totalCount > 0 && (
        <instancedMesh
          ref={moodMeshRef}
          args={[undefined, undefined, totalCount]}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <sphereGeometry args={[1, 16, 16]}/>
          <meshStandardMaterial
            roughness={CONFIG.moodParticle.roughness}
            emissiveIntensity={0.2}
          />
        </instancedMesh>
      )}

      {/* --- 1. Label (悬浮标签) --- */}
      {activePosition && activeMoodData && !showModal && (
        <Html
          position={activePosition}
          center
          distanceFactor={10}
          zIndexRange={[30, 0]}
          style={{pointerEvents: 'none'}}
        >
          <div
            className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer border backdrop-blur-sm transition-colors whitespace-nowrap ${
              dark
                ? 'bg-black/80 text-white border-white/20 hover:bg-white/20'
                : 'bg-white/90 text-gray-900 border-gray-200 hover:bg-white shadow-sm'
            }`}
            style={{pointerEvents: 'auto'}}
            onClick={handleLabelClick}
          >
            {truncateText(activeMoodData.content)}
          </div>
        </Html>
      )}

      {/* --- 2. Modal (详情对话框) --- */}
      {showModal && activeMoodData && (
        <Html
          fullscreen
          transform={false}
          style={{pointerEvents: 'none'}}
          zIndexRange={[200, 0]}>
          <MoodDetailModal
            isOpen={showModal}
            onClose={handleCloseModal}
            data={activeMoodData}
            dark={dark}
          />
        </Html>
      )}
    </group>
  );
}
