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
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);
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

  const groupedPoints = useMemo<GroupedPoint[]>(() => {
    if (!allDiaries || allDiaries.length === 0) return [];
    const groups = new Map<string, Diary[]>();
    const CLUSTERING_PRECISION = 0;

    allDiaries.forEach(diary => {
      if (!diary.coordinates || typeof diary.coordinates.lat !== 'number' || typeof diary.coordinates.lng !== 'number') {
        console.warn('Skipping diary with invalid coordinates:', diary);
        return;
      }

      const key = `${diary.coordinates.lat.toFixed(CLUSTERING_PRECISION)},${diary.coordinates.lng.toFixed(CLUSTERING_PRECISION)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(diary);
    });

    const result: GroupedPoint[] = [];
    for (const [key, diaries] of groups.entries()) {
      // 确保 diaries 数组不为空
      if (diaries.length === 0) continue;

      const sortedDiaries = [...diaries].sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      const latestDiary = sortedDiaries[0];

      const [latStr, lngStr] = key.split(',');
      const groupLat = parseFloat(latStr);
      const groupLng = parseFloat(lngStr);

      result.push({
        key,
        diaries: sortedDiaries,
        latestDiary,
        // 使用聚类的中心坐标，而不是最新日记的精确坐标
        position: latLonToCartesian(groupLat, groupLng, 2.02),
      });
    }
    return result;
  }, [allDiaries]);

  // ===================== 调试日志 =====================
  useEffect(() => {
    console.log("--- [Earth Debug] Final Grouped Points ---");
    console.table(groupedPoints.map(p => ({
      key: p.key,
      diariesCount: p.diaries.length,
      latestDiaryTitle: p.latestDiary.title,
      position: `x:${p.position.x.toFixed(2)}, y:${p.position.y.toFixed(2)}, z:${p.position.z.toFixed(2)}`
    })));

    // 查找位置非常接近的点
    const positionMap = new Map<string, string[]>();
    groupedPoints.forEach(p => {
      const posKey = `${p.position.x.toFixed(2)},${p.position.y.toFixed(2)},${p.position.z.toFixed(2)}`;
      if (!positionMap.has(posKey)) {
        positionMap.set(posKey, []);
      }
      positionMap.get(posKey)!.push(p.key);
    });

    positionMap.forEach((keys, pos) => {
      if (keys.length > 1) {
        console.error(`[Earth Debug] CRITICAL: Multiple groups rendered at the same position ${pos}. Keys:`, keys);
      }
    });

  }, [groupedPoints]);
  // ===================== 调试日志结束 =====================

  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      earthGroupRef.current.rotation.y += delta * 0.04;
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
    setExpandedClusterKey(currentKey => (currentKey === key ? null : key));
    setShouldRotate(false);
  };

  const handleEarthClick = () => {
    if (expandedClusterKey) {
      setExpandedClusterKey(null);
    }
  };

  const visualPointSize = isMobile ? 0.04 : 0.025;
  const hitBoxSize = isMobile ? 0.15 : 0.08;
  const earthGeometry = new THREE.SphereGeometry(2, 64, 64);

  return (
    <group>
      {/*{!isMobile && <Perf position="top-left" />}*/}
      <group ref={earthGroupRef} scale={1.5} rotation={[0.36, Math.PI,0]}>
        <mesh ref={earthMeshRef} geometry={earthGeometry} onClick={handleEarthClick}>
          <meshStandardMaterial map={dayMap} />
        </mesh>

        {dark && (
          <mesh geometry={earthGeometry}>
            <meshBasicMaterial map={nightMap} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
        )}

        {groupedPoints.map(point => {
          // 对于每个点，只渲染一个组件
          return point.diaries.length > 1 ? (
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
          ) : (
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
        })}
      </group>
    </group>
  );
}
