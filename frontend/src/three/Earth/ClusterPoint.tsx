// src/three/Earth/ClusterPoint.tsx
import React, { useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { GroupedPoint, Diary } from './types';
import { useSpring, a, Interpolation } from '@react-spring/three';

// ===================== 1. 共享资源 (静态提取) =====================
// 将几何体和材质提取出来，所有组件共用一份内存
// 半径设为 1，方便后续通过 scale 属性控制大小
const sharedGeometry = new THREE.SphereGeometry(1, 16, 16);

// 基础材质
const clusterMaterial = new THREE.MeshStandardMaterial({
  color: '#ff4444',
  emissive: '#ff4444',
  emissiveIntensity: 0.8,
});

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
      {/* 使用共享几何体和材质，通过 scale 控制大小 (0.02) */}
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

  // 动态计算发光强度，避免创建新材质
  // 注意：如果想完全避免材质切换，可以使用 InstancedMesh (见 Earth.tsx 优化)
  // 这里为了保持 ClusterPoint 的独立性，我们使用 props 控制
  const emissiveIntensity = !isMobile && isHovered ? 0.8 : 0;
  const emissiveColor = !isMobile && isHovered ? '#ff4444' : '#ffffff';

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
          scale={hitBoxSize} // 使用 scale 控制大小
        />

        {/* 可视化 Mesh */}
        <mesh
          geometry={sharedGeometry}
          scale={visualPointSize * 1.2}
          onClick={() => onClusterClick(point.key)}
        >
          {/* 这里我们仍然需要独立的 Material 来处理 hover 状态的颜色变化
               如果想进一步优化，需要将 hover 状态提升到 Earth.tsx 并使用 Instancing
           */}
          <meshStandardMaterial
            color="#ff4444"
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
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
