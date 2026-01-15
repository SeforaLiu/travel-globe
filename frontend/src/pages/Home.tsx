// frontend/src/pages/Home.tsx
import React, {useState} from 'react'
import {Canvas} from '@react-three/fiber'
import {OrbitControls, PresentationControls} from '@react-three/drei'
import {useTranslation} from 'react-i18next'
import {Plus, Globe, Smile} from 'lucide-react'
import {MoodSphere} from '@/three/MoodSphere'
import Earth from '@/three/Earth/Earth'
import {SkyGradientBackground} from "@/three/SkyGradientBackground"
import MoodDialog from "@/components/MoodDialog";
import {useTravelStore} from "@/store/useTravelStore";
import {useNavigate} from "react-router-dom";
import {toast} from "sonner";

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Home({dark, isMobile}: Props) {
  const [moodMode, setMoodMode] = useState(false)
  const [isMoodDialogOpen, setIsMoodDialogOpen] = useState(false)
  const {t} = useTranslation()
  const navigate = useNavigate()

  const moods = useTravelStore(state => state.moods)
  const isLoggedIn = useTravelStore(state => state.isLoggedIn)

  function handleClickAddMood() {
    if(!isLoggedIn){
      toast.info(t('please login first'))
      navigate('/login')
    }else{
      setIsMoodDialogOpen(true)
    }
  }

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
          - 使用 backdrop-blur 制作磨砂玻璃效果
          - 使用 ring/border 增加精致感
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
              ? 'bg-white text-blue-600 shadow-sm scale-100' // 选中样式: 白色背景，蓝色文字
              : 'text-white bg-transparent  hover:bg-white/10 hover:text-white/90' // 未选中样式: 透明背景，白色文字
            }
            `}
          >
            <Globe size={18} className={!moodMode ? "text-blue-500" : "text-white"}/>
            {t('earth')}
          </button>

          {/* Mood 按钮 */}
          <button
            onClick={() => setMoodMode(true)}
            className={`
              relative flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-out
              ${moodMode
              ? 'bg-white text-pink-600 shadow-sm scale-100' // 选中样式: 白色背景，粉色文字(对应心情主题)
              : 'text-white bg-transparent hover:bg-white/10 hover:text-white/90' // 未选中样式
            }
            `}
          >
            <Smile size={18} className={moodMode ? "text-pink-500" : "text-white"}/>
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
              <Plus size={16} className="text-white"/>
            </div>
            <span className="font-medium tracking-wide text-sm">{t('ai.add mood')}</span>
          </button>
        </div>)}
      </div>

      {/* 3D 场景 (保持不变) */}
      <Canvas
        camera={{position: [0, 0, 6]}}
        dpr={[1, 2]}
      >
        <SkyGradientBackground dark={dark}/>

        <ambientLight
          intensity={moodMode ? 3.2 : 2}
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
          config={{mass: 1, tension: 170, friction: 26}}
        >
          {moodMode ? <MoodSphere dark={dark} isMobile={isMobile}/> : <Earth dark={dark} isMobile={isMobile}/>}
        </PresentationControls>
      </Canvas>

      {/* 心情发布对话框 (保持不变) */}
      <MoodDialog
        isOpen={isMoodDialogOpen}
        onClose={() => setIsMoodDialogOpen(false)}
        dark={dark}
      />
    </div>
  )
}
