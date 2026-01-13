// frontend/src/pages/Home.tsx
import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PresentationControls } from '@react-three/drei'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react' // 导入图标
import { MoodSphere } from '../three/MoodSphere'
import Earth from '@/three/Earth/Earth'
import { SkyGradientBackground } from "../three/SkyGradientBackground"
import MoodDialog from "@/components/MoodDialog";

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Home({ dark, isMobile }: Props) {
  const [moodMode, setMoodMode] = useState(false)
  const [isMoodDialogOpen, setIsMoodDialogOpen] = useState(false) // 对话框状态
  const { t } = useTranslation()

  return (
    <div className="h-full relative">
      {/* 顶部控制区域 */}
      <div className="
        absolute
        z-20
        flex
        flex-col
        items-center
        top-4
        inset-x-0
        pointer-events-none

        md:top-4
        md:right-4
        md:items-end
        md:inset-x-auto
      ">
        {/* 切换按钮 */}
        <div className="pointer-events-auto mb-4">
          <button
            onClick={() => setMoodMode(m => !m)}
            className="p-3 rounded-full bg-[#4287f5] text-white shadow text-sm md:text-base w-20 hover:bg-[#3b76d6] transition-colors"
          >
            {moodMode ? t('mood') : t('earth')}
          </button>
        </div>

        {/* +心情 按钮 (仅在 Mood 模式下显示) */}
        {moodMode && (
          <div className="pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300">
            <button
              onClick={() => setIsMoodDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all shadow-lg group"
            >
              <div className="bg-gradient-to-r from-pink-500 to-violet-500 rounded-full p-1 group-hover:scale-110 transition-transform">
                <Plus size={16} />
              </div>
              <span className="font-medium tracking-wide text-sm">{t('Mood')}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3D 场景 */}
      <Canvas
        camera={{ position: [0, 0, 6] }}
        dpr={[1, 2]}
      >
        <SkyGradientBackground dark={dark} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />

        <OrbitControls
          enableZoom={true}
          zoomSpeed={0.5}
          minDistance={1}
          maxDistance={10}
          enablePan={true}
          target={[0, 0, 0]}
          enableRotate={false} // 禁用旋转，让PresentationControls处理
        />

        <PresentationControls
          enabled={true}
          zoom={1}
          global
          polar={[-Math.PI / 2, Math.PI / 2]} // Vertical limits
          azimuth={[-Infinity, Infinity]} // Horizontal limits
          config={{ mass: 1, tension: 170, friction: 26 }}
        >
          {moodMode ? <MoodSphere /> : <Earth dark={dark} isMobile={isMobile} />}
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
