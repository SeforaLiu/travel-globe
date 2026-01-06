// src/three/Earth/Earth.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader, Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { useNavigate } from 'react-router-dom';
import { Perf } from 'r3f-perf';
import { useTravelStore } from '@/store/useTravelStore';

// 引入子组件和类型
import { SinglePoint } from './SinglePoint';
import { ClusterPoint } from './ClusterPoint';
import { Diary, GroupedPoint } from './types';

// latLonToCartesian 函数保持不变
function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Earth({ dark, isMobile }: Props) {
  const earthGroupRef = useRef<THREE.Group>(null!);
  const earthMeshRef = useRef<THREE.Mesh>(null!);

  const navigate = useNavigate();
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null); // 新增 state
  const [shouldRotate, setShouldRotate] = useState(true);
  const allDiaries = useTravelStore(state => state.allDiaries as Diary[]);

  const [dayMap, nightMap] = useLoader(TextureLoader, [
    '/textures/8k_day.jpg',
    '/textures/night.jpg',
  ]);

  useEffect(() => {
    dayMap.anisotropy = 16;
    dayMap.needsUpdate = true;
  }, [dayMap]);

  // 聚合逻辑保持不变
  const groupedPoints = useMemo<GroupedPoint[]>(() => {
    if (!allDiaries || allDiaries.length === 0) return [];
    const groups = new Map<string, Diary[]>();
    const CLUSTERING_PRECISION = 2;

    allDiaries.forEach(diary => {
      const key = `${diary.coordinates.lat.toFixed(CLUSTERING_PRECISION)},${diary.coordinates.lng.toFixed(CLUSTERING_PRECISION)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(diary);
    });

    const result: GroupedPoint[] = [];
    for (const [key, diaries] of groups.entries()) {
      const sortedDiaries = [...diaries].sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      const latestDiary = sortedDiaries[0];
      result.push({
        key,
        diaries: sortedDiaries,
        latestDiary,
        position: latLonToCartesian(latestDiary.coordinates.lat, latestDiary.coordinates.lng, 2.02),
      });
    }
    return result;
  }, [allDiaries]);

  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      earthGroupRef.current.rotation.y += delta * 0.05;
    }
  });

  const handlePointerEnter = (key: string) => {
    if (!isMobile) {
      setHoveredPointKey(key);
      setShouldRotate(false);
    }
  };

  const handlePointerLeave = () => {
    setHoveredPointKey(null);
    if (!isMobile) {
      setTimeout(() => setShouldRotate(true), 1000);
    }
  };

  const handleClick = (e: any, pathId: number) => {
    e.stopPropagation();
    if (isMobile && 'vibrate' in navigator) navigator.vibrate(50);
    navigate(`/diary/${pathId}`);
  };

  const handleClusterClick = (key: string) => {
    setExpandedClusterKey(currentKey => (currentKey === key ? null : key)); // 点击同一个集群可以收起
    setShouldRotate(false); // 展开时停止旋转
  };

  const handleEarthClick = () => {
    if (expandedClusterKey) {
      setExpandedClusterKey(null); // 点击地球任何地方收起集群
    }
  };

  const visualPointSize = isMobile ? 0.04 : 0.025;
  const hitBoxSize = isMobile ? 0.15 : 0.08;
  const earthGeometry = new THREE.SphereGeometry(2, 64, 64);

  return (
    <group>
      {/*{!isMobile && <Perf position="top-left" />}*/}
      <group ref={earthGroupRef} scale={1.5}>
        <mesh ref={earthMeshRef} geometry={earthGeometry} onClick={handleEarthClick}>
          <meshStandardMaterial map={dayMap} />
        </mesh>

        {dark && (
          <mesh geometry={earthGeometry}>
            <meshBasicMaterial map={nightMap} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
        )}

        {groupedPoints.map(point => {
          const isCluster = point.diaries.length > 1;
          if (isCluster) {
            return (
              <ClusterPoint
                key={point.key}
                point={point}
                isExpanded={expandedClusterKey === point.key}
                isMobile={isMobile}
                isHovered={hoveredPointKey === point.key}
                visualPointSize={visualPointSize}
                hitBoxSize={hitBoxSize}
                earthMeshRef={earthMeshRef}
                handleClick={handleClick}
                handlePointerEnter={handlePointerEnter}
                handlePointerLeave={handlePointerLeave}
                onClusterClick={handleClusterClick}
              />
            );
          } else {
            return (
              <SinglePoint
                key={point.key}
                point={point}
                isMobile={isMobile}
                isHovered={hoveredPointKey === point.key}
                visualPointSize={visualPointSize}
                hitBoxSize={hitBoxSize}
                earthMeshRef={earthMeshRef}
                handleClick={handleClick}
                handlePointerEnter={handlePointerEnter}
                handlePointerLeave={handlePointerLeave}
              />
            );
          }
        })}
      </group>
    </group>
  );
}
