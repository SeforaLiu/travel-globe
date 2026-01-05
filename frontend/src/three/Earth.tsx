import React, {useRef, useState, useEffect, useMemo} from 'react' // 引入 useMemo
import {useFrame, useLoader} from "@react-three/fiber";
import * as THREE from 'three'
import {Html} from '@react-three/drei'
import {TextureLoader} from 'three/src/loaders/TextureLoader'
import {useNavigate} from "react-router-dom";
import {Perf} from "r3f-perf";
import {useTravelStore} from "@/store/useTravelStore";
import {DiarySummary} from "@/types/diary";

// 聚合后的点的数据结构
interface GroupedPoint {
  key: string; // 聚合点的唯一标识，例如 "22.5,114.1"
  diaries: DiarySummary[]; // 这个点包含的所有日记
  position: THREE.Vector3; // 计算好的三维坐标
  latestDiary: DiarySummary; // 这个点中最新的一篇日记
}


function latLonToCartesian(lat: number, lon: number, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius * Math.sin(phi) * Math.cos(theta))
  const z = radius * Math.sin(phi) * Math.sin(theta)
  const y = radius * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Earth({dark, isMobile}: Props) {
  const earthGroupRef = useRef<THREE.Group>(null!)
  const earthMeshRef = useRef<THREE.Mesh>(null!)

  const navigate = useNavigate();
  const [hoveredPointKey, setHoveredPointKey] = useState<string | null>(null)
  const [shouldRotate, setShouldRotate] = useState(true)
  const fetchAllDiaries = useTravelStore(state => state.fetchAllDiaries);
  const allDiaries = useTravelStore(state => state.allDiaries);
  const isLoggedIn = useTravelStore(state => state.isLoggedIn);

  const [dayMap, nightMap] = useLoader(TextureLoader, [
    '/textures/8k_day.jpg',
    '/textures/night.jpg'
  ])

  useEffect(()=>{
    dayMap.anisotropy = 16;
    dayMap.needsUpdate = true;
  },[dayMap])

  // 改进后的 useEffect，依赖项更安全
  useEffect(() => {
    if(isLoggedIn){
      fetchAllDiaries()
    }
  }, [isLoggedIn, fetchAllDiaries]);


  // 使用 useMemo 来聚合日记数据
  const groupedPoints = useMemo<GroupedPoint[]>(() => {
    if (!allDiaries || allDiaries.length === 0) {
      return [];
    }
    console.log('开始聚合日记数据...', allDiaries);

    // 1. 使用 Map 进行分组
    const groups = new Map<string, DiarySummary[]>();
    const CLUSTERING_PRECISION = 1; // 聚合精度，小数点后1位，约11km。可调整此值。

    allDiaries.forEach(diary => {
      const lat = diary.coordinates.lat;
      const lng = diary.coordinates.lng;
      // 创建聚合的 key
      const key = `${lat.toFixed(CLUSTERING_PRECISION)},${lng.toFixed(CLUSTERING_PRECISION)}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(diary);
    });

    // 2. 将 Map 转换为我们需要的数组结构
    const result: GroupedPoint[] = [];
    for (const [key, diaries] of groups.entries()) {
      // 对每个分组内的日记按创建时间降序排序，确保第一篇是最新的
      const sortedDiaries = [...diaries].sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());
      const latestDiary = sortedDiaries[0];

      result.push({
        key: key,
        diaries: sortedDiaries,
        latestDiary: latestDiary,
        position: latLonToCartesian(latestDiary.coordinates.lat, latestDiary.coordinates.lng, 2.02),
      });
    }
    console.log('聚合完成，生成了', result.length, '个点');
    return result;
  }, [allDiaries]);


  useFrame((_, delta) => {
    if (earthGroupRef.current && shouldRotate) {
      earthGroupRef.current.rotation.y += delta * 0.05
    }
  })

  const handlePointerEnter = (key: string) => {
    if (!isMobile) {
      setHoveredPointKey(key)
      setShouldRotate(false)
    }
  }

  const handlePointerLeave = () => {
    setHoveredPointKey(null)
    if (!isMobile) {
      setTimeout(() => {
        setShouldRotate(true)
      }, 1000)
    }
  }

  const handleClick = (e: any, pathId: number) => {
    e.stopPropagation()
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(50)
    }
    console.log('点击跳转到日记ID:', pathId)
    navigate(`/diary/${pathId}`)
  }

  const visualPointSize = isMobile ? 0.04 : 0.025;
  const hitBoxSize = isMobile ? 0.15 : 0.08;

  const earthGeometry = new THREE.SphereGeometry(2, 64, 64)

  return (
    <group>
      {/*{!isMobile && <Perf position="top-left"/>}*/}
      <group ref={earthGroupRef} scale={1.5}>
        {/* 地球球体 */}
        <mesh ref={earthMeshRef} geometry={earthGeometry}>
          <meshStandardMaterial map={dayMap} />
        </mesh>

        {dark && (
          <mesh geometry={earthGeometry}>
            <meshBasicMaterial
              map={nightMap}
              transparent={true}
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )}

        {/* 使用聚合后的数据进行渲染 */}
        {groupedPoints.map(point => {
          const isHovered = hoveredPointKey === point.key
          const shouldShowLabel = isMobile ? true : isHovered

          // 根据聚合点内的日记数量决定显示内容
          const labelText = point.diaries.length > 1
            ? `${point.latestDiary.title} (${point.diaries.length})`
            : point.latestDiary.title;

          return (
            <group
              key={point.key} // 使用聚合 key 作为 React 的 key
              position={point.position.toArray()}
            >
              <mesh
                visible={false}
                // 点击时，总是导航到该地点最新的日记
                onClick={(e) => handleClick(e, point.latestDiary.id)}
                onPointerEnter={() => handlePointerEnter(point.key)}
                onPointerLeave={handlePointerLeave}
              >
                <sphereGeometry args={[hitBoxSize, 8, 8]}/>
                <meshBasicMaterial transparent opacity={0}/>
              </mesh>

              <mesh>
                <sphereGeometry args={[visualPointSize, 16, 16]}/>
                <meshStandardMaterial
                  color="orange"
                  emissive={(!isMobile && isHovered) ? 'orange' : '#ffffff'}
                  emissiveIntensity={(!isMobile && isHovered) ? 0.8 : 0}
                />
              </mesh>

              {shouldShowLabel && (
                <Html
                  position={[0, 0.1, 0]}
                  distanceFactor={8}
                  center
                  occlude={[earthMeshRef]}
                  scale={2}
                  style={{pointerEvents: 'none'}}
                  zIndexRange={[30, 0]}
                >
                  <div
                    style={{pointerEvents: 'auto'}}
                    // 点击标签也导航到最新的日记
                    onClick={(e) => handleClick(e, point.latestDiary.id)}
                    className={`
                      bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap
                      cursor-pointer transition-opacity duration-200
                      ${isHovered ? 'opacity-100' : 'opacity-90'}
                    `}
                  >
                    {labelText}
                  </div>
                </Html>
              )}
            </group>
          )
        })}
      </group>
    </group>
  )
}
