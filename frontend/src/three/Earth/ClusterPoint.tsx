// src/three/Earth/ClusterPoint.tsx
import React, { useMemo, useState } from 'react';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { GroupedPoint, Diary } from './types';
import { useSpring, a, Interpolation } from '@react-spring/three';

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

// 单个散开的日记点
function SpiderfiedItem({ diary, position, earthMeshRef, handleClick }: SpiderfiedItemProps) {
  const [isLabelHovered, setIsLabelHovered] = useState(false);
  const { scale } = useSpring({ scale: isLabelHovered ? 1.2 : 1 });

  return (
    // [最终修复] 2. 使用我们新创建的 AnimatedGroup 组件
    <AnimatedGroup position={position} scale={scale}>
      <mesh onClick={(e) => handleClick(e, diary.id)}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={0.6} />
      </mesh>
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
}

export function ClusterPoint({
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

    const radius = 0.15;
    const angleStep = (Math.PI * 2) / count;
    const normal = point.position.clone().normalize();
    const arbitraryVec = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3().crossVectors(normal, arbitraryVec).normalize();
    const quaternion = new THREE.Quaternion();

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
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

  return (
    <group>
      {/* 集群中心点 */}
      <group
        position={point.position.toArray()}
        onPointerEnter={() => !isExpanded && handlePointerEnter(point.key)}
        onPointerLeave={() => !isExpanded && handlePointerLeave()}
      >
        <mesh
          visible={false}
          onClick={() => onClusterClick(point.key)}
        >
          <sphereGeometry args={[hitBoxSize, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        <mesh>
          <sphereGeometry args={[visualPointSize * 1.2, 16, 16]} />
          <meshStandardMaterial
            color="#ff4444"
            emissive={!isMobile && isHovered ? '#ff4444' : '#ffffff'}
            emissiveIntensity={!isMobile && isHovered ? 0.8 : 0}
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

      {/* 蜘蛛化展开的点和线 */}
      {isExpanded && spiderfiedPositions.map((spiderPos, index) => {
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
      })}
    </group>
  );
}
