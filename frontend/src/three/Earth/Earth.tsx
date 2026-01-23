// src/three/Earth/Earth.tsx
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { useNavigate } from 'react-router-dom';
import { useTravelStore } from '@/store/useTravelStore';
import { Instances, Instance, Html } from '@react-three/drei';

import { ClusterPoint } from './ClusterPoint';
import { Diary, GroupedPoint } from './types';
import { BreathingInstance } from './BreathingInstance';

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

const dayImageUrl = 'https://res.cloudinary.com/ggg-lll/image/upload/v1769159373/travel_globe_prod/photos/8k_day_yftl7r.jpg'
const nightImageUrl = 'https://res.cloudinary.com/ggg-lll/image/upload/v1769159773/travel_globe_prod/photos/night_sd1kpe.jpg'

export default function Earth({ dark, isMobile }: Props) {
  const earthGroupRef = useRef<THREE.Group>(null!);
  const earthMeshRef = useRef<THREE.Mesh>(null!);
  const navigate = useNavigate();

  // 状态管理
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null);
  const [selectedPointKey, setSelectedPointKey] = useState<string | null>(null);
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);
  const [shouldRotate, setShouldRotate] = useState(true);

  const allDiaries = useTravelStore(state => state.allDiaries as Diary[]);

  const [dayMap, nightMap] = useLoader(TextureLoader, [
    dayImageUrl,
    nightImageUrl
  ]);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;

    dayMap.anisotropy = 8;
    nightMap.anisotropy = 8;
  }, [dayMap, nightMap]);

  const groupedPoints = useMemo<GroupedPoint[]>(() => {
    if (!allDiaries || allDiaries.length === 0) return [];
    const groups = new Map<string, Diary[]>();
    const CLUSTERING_PRECISION = 0;
    allDiaries.forEach(diary => {
      if (!diary.coordinates?.lat || !diary.coordinates?.lng) return;
      const key = `${diary.coordinates.lat.toFixed(CLUSTERING_PRECISION)},${diary.coordinates.lng.toFixed(CLUSTERING_PRECISION)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(diary);
    });
    const result: GroupedPoint[] = [];
    for (const [key, diaries] of groups.entries()) {
      if (diaries.length === 0) continue;
      const sorted = [...diaries].sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      const [lat, lng] = key.split(',').map(parseFloat);
      result.push({
        key,
        diaries: sorted,
        latestDiary: sorted[0],
        position: latLonToCartesian(lat, lng, 2.02)
      });
    }
    return result;
  }, [allDiaries]);

  const activePointKey = isMobile ? selectedPointKey : hoveredPointKey;

  const activePointData = useMemo(() =>
      groupedPoints.find(p => p.key === activePointKey),
    [groupedPoints, activePointKey]);

  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      earthGroupRef.current.rotation.y += delta * 0.04;
    }
  });

  // ===================== 关键修改 2: 交互逻辑 =====================
  const handlePointClick = (e: any, point: GroupedPoint) => {
    e.stopPropagation();

    // 1. 如果是集群，优先展开 (移动端和桌面端逻辑一致)
    if (point.diaries.length > 1) {
      if (expandedClusterKey === point.key) {
        setExpandedClusterKey(null); // 收起
        setShouldRotate(true);
      } else {
        setExpandedClusterKey(point.key); // 展开
        setShouldRotate(false);
        // 展开时，清除选中状态，避免 Label 重叠
        setSelectedPointKey(null);
      }
      return;
    }

    // 2. 如果是单点
    if (isMobile) {
      // 移动端逻辑：第一次点击选中(显示Label)，第二次点击跳转
      if (selectedPointKey !== point.key) {
        setSelectedPointKey(point.key);
        setShouldRotate(false); // 选中时停止旋转，方便查看
      } else {
        // 已经选中了，再次点击 -> 跳转
        if (isMobile && 'vibrate' in navigator) navigator.vibrate(50);
        navigate(`/diary/${point.latestDiary.id}`);
      }
    } else {
      // 桌面端逻辑：直接跳转
      navigate(`/diary/${point.latestDiary.id}`);
    }
  };

  // 点击地球空白处：取消选中/收起集群
  const handleEarthClick = () => {
    if (expandedClusterKey) setExpandedClusterKey(null);
    if (selectedPointKey) setSelectedPointKey(null);
    setShouldRotate(true);
  };

  const handlePointerEnter = (e: any, key: string) => {
    e.stopPropagation();
    if (!isMobile) {
      setHoveredPointKey(key);
      setShouldRotate(false);
    }
  };

  const handlePointerLeave = () => {
    setHoveredPointKey(null);
    if (!isMobile) setTimeout(() => setShouldRotate(true), 1000);
  };

  const visualPointSize = isMobile ? 0.04 : 0.025;

  return (
    <group>
      {/*{!isMobile && <Perf position="top-left" />}*/}
      <group ref={earthGroupRef} scale={1.5} rotation={[0.36, Math.PI, 0]}>

        {/* 地球 Mesh */}
        <mesh ref={earthMeshRef} geometry={new THREE.SphereGeometry(2, 64, 64)} onClick={handleEarthClick}>
          <meshStandardMaterial map={dayMap ?? undefined} />
        </mesh>
        {dark && (
          <mesh geometry={new THREE.SphereGeometry(2, 64, 64)}>
            <meshBasicMaterial map={nightMap} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
          </mesh>
        )}

        {/* ===================== InstancedMesh (高性能点阵) ===================== */}
        <Instances range={1000}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial />
          {groupedPoints.map((point) => {
            if (expandedClusterKey === point.key) return null;
            const isCluster = point.diaries.length > 1;
            const isVisited = point.diaries[0].entry_type === 'visited';
            const singlePointColor = isVisited ? '#ffb900' : '#7c86ff';

            // 逻辑修正：isHighlighted 决定了是否停止呼吸
            const isHighlighted = isMobile
              ? selectedPointKey === point.key
              : hoveredPointKey === point.key;
            // 基础颜色：如果是高亮，直接给红色，否则给普通颜色
            // BreathingInstance 内部会处理“未高亮时的呼吸变色”
            let baseColor = isCluster ? '#8200db' : singlePointColor;
            if (isHighlighted) baseColor = '#ff2056';
            return (
              <BreathingInstance
                key={point.key}
                position={point.position}
                // 这里的 scale 是基础大小
                baseScale={isCluster ? visualPointSize * 1.2 : visualPointSize}
                baseColor={baseColor}
                isHighlighted={isHighlighted}
                onClick={(e) => handlePointClick(e, point)}
                onPointerEnter={(e) => handlePointerEnter(e, point.key)}
                onPointerLeave={handlePointerLeave}
              />
            );
          })}
        </Instances>

        {/* ===================== 展开的集群组件 ===================== */}
        {expandedClusterKey && (
          <ClusterPoint
            point={groupedPoints.find(p => p.key === expandedClusterKey)!}
            isExpanded={true}
            isMobile={isMobile}
            isHovered={false}
            visualPointSize={visualPointSize}
            hitBoxSize={isMobile ? 0.15 : 0.08}
            earthMeshRef={earthMeshRef}
            handleClick={(e, id) => { e.stopPropagation(); navigate(`/diary/${id}`); }}
            handlePointerEnter={() => {}}
            handlePointerLeave={() => {}}
            onClusterClick={() => {
              setExpandedClusterKey(null);
              setShouldRotate(true);
            }}
          />
        )}

        {/* ===================== 全局 Label 系统 (单例模式) ===================== */}
        {/*
            这里解决了移动端的问题：
            我们只渲染 activePointData 对应的 Label。
            在移动端，activePointData 是用户点击选中的那个点。
        */}
        {activePointData && !expandedClusterKey && (
          <group position={activePointData.position}>
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
                // 移动端点击 Label 也可以跳转
                onClick={(e) => handlePointClick(e, activePointData)}
                className={`text-white text-xs px-2 py-1 rounded whitespace-nowrap cursor-pointer
                  ${activePointData.diaries.length > 1 ? 'bg-red-800/80 rounded-full' : 'bg-black/70'}`}
              >
                {activePointData.diaries.length > 1
                  ? activePointData.diaries.length
                  : activePointData.latestDiary.title}
              </div>
            </Html>
          </group>
        )}

      </group>
    </group>
  );
}
