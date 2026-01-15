// frontend/src/pages/Home.tsx
import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PresentationControls } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import { Plus, Globe, Smile } from 'lucide-react'
import { MoodSphere } from '@/three/MoodSphere'
import Earth from '@/three/Earth/Earth'
import { SkyGradientBackground } from "@/three/SkyGradientBackground"
import MoodDialog from "@/components/MoodDialog";
import { useTravelStore } from "@/store/useTravelStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTransition, useSpring, a } from '@react-spring/three'

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Home({ dark, isMobile }: Props) {
  const [moodMode, setMoodMode] = useState(false)
  const [isMoodDialogOpen, setIsMoodDialogOpen] = useState(false)
  const { t } = useTranslation()
  const navigate = useNavigate()

  const moods = useTravelStore(state => state.moods)
  const isLoggedIn = useTravelStore(state => state.isLoggedIn)

  // --- 2. 配置组件切换动画 (Transition) ---
  // item 代表 moodMode 的状态 (true/false)
  const transitions = useTransition(moodMode, {
    from: { scale: 0, rotation: [0, -Math.PI, 0] }, // 初始: 缩放为0, 旋转-180度
    enter: { scale: 1, rotation: [0, 0, 0] },       // 进入: 正常大小, 旋转归零
    leave: { scale: 0, rotation: [0, Math.PI, 0] }, // 离开: 缩放为0, 旋转180度
    config: { mass: 1, tension: 280, friction: 60 }, // 物理参数: 弹性适中
    expires: true, // 关键: 动画结束后彻底卸载旧组件，释放性能
  })

  // --- 3. 配置环境光过渡动画 (Spring) ---
  // 平滑改变环境光强度，防止切换时亮度跳变
  const { ambientIntensity } = useSpring({
    ambientIntensity: moodMode ? 3 : 2,
    config: { duration: 500 } // 500ms 线性过渡
  })

  function handleClickAddMood() {
    if (!isLoggedIn) {
      toast.info(t('please login first'))
      navigate('/login')
    } else {
      setIsMoodDialogOpen(true)
    }
  }

  // @ts-ignore
  return (
    <div className="h-full relative">
      {/* 顶部控制区域 */}
      <div className="
        absolute
        z-20
        flex
        flex-col
        items-center
        top-6
        inset-x-0
        pointer-events-none
      ">
        {/*
          1. 切换器容器 (Segmented Control)
        */}
        <div className="
          pointer-events-auto
          mb-6
          p-1.5
          flex
          items-center
          gap-1
          rounded-full
          bg-white/20
          dark:bg-black/20
          backdrop-blur-xl
          border
          border-white/20
          shadow-lg
        ">
          {/* Earth 按钮 */}
          <button
            onClick={() => setMoodMode(false)}
            className={`
              relative flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-out
              ${!moodMode
              ? 'bg-white text-blue-600 shadow-sm scale-100' // 选中样式
              : 'text-white bg-transparent  hover:bg-white/10 hover:text-white/90' // 未选中样式
            }
            `}
          >
            <Globe size={18} className={!moodMode ? "text-blue-500" : "text-white"} />
            {t('earth')}
          </button>

          {/* Mood 按钮 */}
          <button
            onClick={() => setMoodMode(true)}
            className={`
              relative flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-out
              ${moodMode
              ? 'bg-white text-pink-600 shadow-sm scale-100' // 选中样式
              : 'text-white bg-transparent hover:bg-white/10 hover:text-white/90' // 未选中样式
            }
            `}
          >
            <Smile size={18} className={moodMode ? "text-pink-500" : "text-white"} />
            {t('mood')}
          </button>
        </div>

        {/* +心情 按钮 (仅在 Mood 模式下显示) */}
        {moodMode && (<div className={`
          pointer-events-auto 
          transition-all duration-500 ease-in-out translate-y-0
          ${!moods.length ? 'animate-subtle-pulse' : ''}
        `}>
          <button
            onClick={() => handleClickAddMood()}
            className="
              flex items-center gap-2 px-5 py-2.5
              bg-white/10 backdrop-blur-md
              border border-white/20 rounded-full
              text-white
              hover:bg-white/20 hover:scale-105 active:scale-95
              transition-all duration-300
              shadow-lg group
            "
          >
            <div
              className="bg-gradient-to-r from-neutral-50 to-violet-600 rounded-full p-1 group-hover:rotate-90 transition-transform duration-500">
              <Plus size={16} className="text-white" />
            </div>
            <span className="font-medium tracking-wide text-sm">{t('ai.add mood')}</span>
          </button>
        </div>)}
      </div>

      {/* 3D 场景 */}
      <Canvas
        camera={{ position: [0, 0, 6] }}
        dpr={[1, 2]}
      >
        <SkyGradientBackground dark={dark} />

        {/* 4. 使用 animated (a) 组件应用动态光照强度 */}
        <a.ambientLight
          intensity={ambientIntensity}
          color='#ffffff'
        />

        <OrbitControls
          enableZoom={true}
          zoomSpeed={0.5}
          minDistance={1}
          maxDistance={10}
          enablePan={true}
          target={[0, 0, 0]}
          enableRotate={false}
        />

        <PresentationControls
          enabled={true}
          zoom={1}
          global
          polar={[-Math.PI / 2, Math.PI / 2]}
          azimuth={[-Infinity, Infinity]}
          config={{ mass: 1, tension: 170, friction: 26 }}
        >
          {/* 5. 使用 transitions 渲染组件 */}
          {transitions((style, item) => (
            <a.group
              // 应用动画样式 (scale, rotation)
              // @ts-ignore: react-spring 的 rotation 类型定义在某些版本可能与 Three.js 不完全匹配，这里忽略 TS 检查
              scale={style.scale}
              rotation={style.rotation}
            >
              {item ? (
                // MoodSphere 及其内部私有灯光 (RectAreaLight)
                <MoodSphere dark={dark} isMobile={isMobile} />
              ) : (
                // Earth 及其内部私有灯光 (DirectionalLight)
                <Earth dark={dark} isMobile={isMobile} />
              )}
            </a.group>
          ))}
        </PresentationControls>
      </Canvas>

      {/* 心情发布对话框 */}
      <MoodDialog
        isOpen={isMoodDialogOpen}
        onClose={() => setIsMoodDialogOpen(false)}
        dark={dark}
      />
    </div>
  )
}
