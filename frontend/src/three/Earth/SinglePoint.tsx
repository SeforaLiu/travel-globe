// src/three/Earth/SinglePoint.tsx
import React from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GroupedPoint } from './types';

type Props = {
  point: GroupedPoint;
  isMobile: boolean;
  isHovered: boolean;
  visualPointSize: number;
  hitBoxSize: number;
  earthMeshRef: React.RefObject<THREE.Mesh>;
  handleClick: (e: any, pathId: number) => void;
  handlePointerEnter: (key: string) => void;
  handlePointerLeave: () => void;
};

export function SinglePoint({
                              point,
                              isMobile,
                              isHovered,
                              visualPointSize,
                              hitBoxSize,
                              earthMeshRef,
                              handleClick,
                              handlePointerEnter,
                              handlePointerLeave,
                            }: Props) {
  const shouldShowLabel = isMobile ? true : isHovered;

  return (
    <group position={point.position.toArray()}>
      <mesh
        visible={false}
        onClick={(e) => handleClick(e, point.latestDiary.id)}
        onPointerEnter={() => handlePointerEnter(point.key)}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[hitBoxSize, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh>
        <sphereGeometry args={[visualPointSize, 16, 16]} />
        <meshStandardMaterial
          color="orange"
          emissive={!isMobile && isHovered ? 'orange' : '#ffffff'}
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
            onClick={(e) => handleClick(e, point.latestDiary.id)}
            className="bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap cursor-pointer transition-opacity duration-200 opacity-90 hover:opacity-100"
          >
            {point.latestDiary.title}
          </div>
        </Html>
      )}
    </group>
  );
}
