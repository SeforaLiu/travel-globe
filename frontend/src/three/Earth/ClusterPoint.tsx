// src/three/Earth/ClusterPoint.tsx
import React, { useMemo, useState, useRef } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; // 1. 引入 useFrame
import { GroupedPoint, Diary } from './types';
import { useSpring, a, Interpolation } from '@react-spring/three';

// ===================== 1. 共享资源 (静态提取) =====================
const sharedGeometry = new THREE.SphereGeometry(1, 16, 16);

// 子节点材质 (展开后的小点)
const spiderItemMaterial = new THREE.MeshStandardMaterial({
  color: '#ff8800',
  emissive: '#ff8800',
  emissiveIntensity: 0.6,
});

// 不可见的点击热区材质
const hitBoxMaterial = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0,
});

type Props = {
  point: GroupedPoint;
  isExpanded: boolean;
  isMobile: boolean;
  isHovered: boolean;
  visualPointSize: number;
  hitBoxSize: number;
  earthMeshRef: React.RefObject<THREE.Mesh>;
  handleClick: (e: any, pathId: number) => void;
  handlePointerEnter: (key: string) => void;
  handlePointerLeave: () => void;
  onClusterClick: (key: string) => void;
};

const AnimatedLine = a(Line);
const AnimatedGroup = a.group as React.FC<any>;

type SpiderfiedItemProps = {
  diary: Diary;
  position: Interpolation<number, THREE.Vector3>;
  earthMeshRef: React.RefObject<THREE.Mesh>;
  handleClick: (e: any, pathId: number) => void;
};

// 使用 React.memo 避免不必要的重渲染
const SpiderfiedItem = React.memo(function SpiderfiedItem({ diary, position, earthMeshRef, handleClick }: SpiderfiedItemProps) {
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const { scale } = useSpring({ scale: isLabelHovered ? 1.2 : 1 });

  return (
    <AnimatedGroup position={position} scale={scale}>
      <mesh
        geometry={sharedGeometry}
        material={spiderItemMaterial}
        scale={0.02}
        onClick={(e) => handleClick(e, diary.id)}
      />
      <Html
        position={[0, 0.05, 0]}
        distanceFactor={8}
        center
        occlude={[earthMeshRef]}
        scale={1.5}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[40, 0]}
      >
        <div
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => handleClick(e, diary.id)}
          onPointerEnter={() => setIsLabelHovered(true)}
          onPointerLeave={() => setIsLabelHovered(false)}
          className="bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap cursor-pointer"
        >
          {diary.title}
        </div>
      </Html>
    </AnimatedGroup>
  );
});

export const ClusterPoint = React.memo(function ClusterPoint({
                                                               point,
                                                               isExpanded,
                                                               isMobile,
                                                               isHovered,
                                                               visualPointSize,
                                                               hitBoxSize,
                                                               earthMeshRef,
                                                               handleClick,
                                                               handlePointerEnter,
                                                               handlePointerLeave,
                                                               onClusterClick,
                                                             }: Props) {
  const shouldShowLabel = isMobile ? true : isHovered && !isExpanded;

  // ===================== 2. 呼吸效果逻辑 (新增) =====================
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // 生成随机偏移量，避免所有点同步呼吸，看起来更自然
  const randomOffset = useMemo(() => Math.random() * 100, []);

  // 基础颜色定义
  const baseColor = new THREE.Color('#ff4444');
  const targetColor = new THREE.Color();

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    // 停止呼吸的条件：已展开 OR (被Hover 且 不是移动端)
    // 移动端没有 Hover 状态，所以主要看 isExpanded
    const shouldStopBreathing = isExpanded || (!isMobile && isHovered);

    if (shouldStopBreathing) {
      // 恢复到标准高亮状态
      // 1.2 是基础放大倍数
      meshRef.current.scale.setScalar(visualPointSize * 1.2);

      // 恢复高亮颜色/强度
      materialRef.current.emissiveIntensity = 0.8;
      materialRef.current.color.set(baseColor);
      return;
    }

    // === 执行呼吸动画 ===
    const time = state.clock.elapsedTime;
    // 构造 0 到 1 的正弦波，频率为 3
    const breatheFactor = (Math.sin((time * 3) + randomOffset) + 1) / 2;

    // 1. 缩放: 在 1.0 ~ 1.3 倍之间波动
    const currentScale = (visualPointSize * 1.2) * (1 + breatheFactor * 0.3);
    meshRef.current.scale.setScalar(currentScale);

    // 2. 颜色/亮度:
    // 变大(breatheFactor -> 1) -> 颜色变浅/亮 (emissiveIntensity 变大, 混入白色)
    // 变小(breatheFactor -> 0) -> 颜色变深 (emissiveIntensity 变小, 恢复原色)

    // 动态调整发光强度 (0.2 ~ 0.8)
    materialRef.current.emissiveIntensity = 0.2 + (breatheFactor * 0.6);

    // 动态调整颜色 (混入白色使颜色变浅)
    targetColor.copy(baseColor).lerp(new THREE.Color('#ffffff'), breatheFactor * 0.3);
    materialRef.current.color.copy(targetColor);
  });
  // ===============================================================

  const spiderfiedPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    const count = point.diaries.length;
    if (count <= 1) return positions;

    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    const PHYLLOTAXIS_RADIUS_STEP = 0.15;

    const normal = point.position.clone().normalize();
    const arbitraryVec = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(normal, arbitraryVec).normalize();
    const quaternion = new THREE.Quaternion();

    for (let i = 0; i < count; i++) {
      const radius = PHYLLOTAXIS_RADIUS_STEP * Math.sqrt(i + 1);
      const angle = i * GOLDEN_ANGLE;

      quaternion.setFromAxisAngle(normal, angle);
      const offset = tangent.clone().applyQuaternion(quaternion).multiplyScalar(radius);
      const newPos = point.position.clone().add(offset).normalize().multiplyScalar(point.position.length());
      positions.push(newPos);
    }

    return positions;
  }, [point.diaries.length, point.position]);

  const { t } = useSpring({
    t: isExpanded ? 1 : 0,
    config: { tension: 200, friction: 20 },
  });

  let spiderfiedContent = null;
  if (isExpanded) {
    spiderfiedContent = spiderfiedPositions.map((spiderPos, index) => {
      const diary = point.diaries[index];
      const animatedPosition = t.to(val =>
        new THREE.Vector3().lerpVectors(point.position, spiderPos, val)
      );
      const animatedPoints = t.to(val => {
        const interpolatedPos = new THREE.Vector3().lerpVectors(point.position, spiderPos, val);
        return [point.position, interpolatedPos];
      });

      return (
        <React.Fragment key={diary.id}>
          <SpiderfiedItem
            diary={diary}
            position={animatedPosition}
            earthMeshRef={earthMeshRef}
            handleClick={handleClick}
          />
          <AnimatedLine
            points={animatedPoints as any}
            color="white"
            lineWidth={0.5}
            transparent
            opacity={t.to(val => val * 0.75)}
          />
        </React.Fragment>
      );
    });
  }

  return (
    <group>
      <group
        position={point.position.toArray()}
        onPointerEnter={() => !isExpanded && handlePointerEnter(point.key)}
        onPointerLeave={() => !isExpanded && handlePointerLeave()}
      >
        {/* 热区 Mesh */}
        <mesh
          visible={false}
          onClick={() => onClusterClick(point.key)}
          geometry={sharedGeometry}
          material={hitBoxMaterial}
          scale={hitBoxSize}
        />

        {/* 可视化 Mesh (中心点) */}
        <mesh
          ref={meshRef} // 绑定 Mesh Ref
          geometry={sharedGeometry}
          // scale 由 useFrame 控制，这里给初始值
          scale={visualPointSize * 1.2}
          onClick={() => onClusterClick(point.key)}
        >
          {/* 绑定 Material Ref，以便在 useFrame 中修改颜色和发光 */}
          <meshStandardMaterial
            ref={materialRef}
            color="#ff4444"
            emissive="#ff4444"
            emissiveIntensity={0.8} // 初始值
          />
        </mesh>

        {shouldShowLabel && (
          <Html
            position={[0, 0.1, 0]}
            distanceFactor={8}
            center
            occlude={[earthMeshRef]}
            scale={2}
            style={{ pointerEvents: 'none' }}
            zIndexRange={[30, 0]}
          >
            <div
              style={{ pointerEvents: 'auto' }}
              onClick={() => onClusterClick(point.key)}
              className="bg-red-800/80 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap cursor-pointer"
            >
              {point.diaries.length}
            </div>
          </Html>
        )}
      </group>

      {spiderfiedContent}
    </group>
  );
});
