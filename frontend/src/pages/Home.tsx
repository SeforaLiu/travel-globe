import React, {useState} from 'react'
import {Canvas} from '@react-three/fiber'
import {OrbitControls, PresentationControls} from '@react-three/drei'
import {useTranslation} from 'react-i18next'
import {MoodSphere} from '../three/MoodSphere'
import Earth from '../three/Earth'
import {SkyGradientBackground} from "../three/SkyGradientBackground";

type Props = {
  dark: boolean;
  isMobile: boolean;
};

export default function Home({dark, isMobile}: Props) {
  const [moodMode, setMoodMode] = useState(false)
  const {t} = useTranslation()

  return (
    <div className="h-full relative">
      <div className="
        absolute
        z-20
        flex
        justify-center
        items-start
        top-4
        inset-x-0

        md:top-4
        md:right-4
        md:inset-x-auto
        md:transform-none"
      >
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setMoodMode(m => !m)}
            className="p-3 rounded-full bg-[#4287f5] text-white shadow text-sm md:text-base w-20"
          >
            {moodMode ? t('mood') : t('earth')}
          </button>
        </div>
      </div>

      <Canvas
        camera={{position: [0, 0, 6]}}
        dpr={[1, 2]}
      >
        <SkyGradientBackground dark={dark}/>
        <ambientLight intensity={1.6}/>
        <directionalLight position={[5, 5, 5]} intensity={1.2}/>

        <OrbitControls
          enableZoom={true}
          zoomSpeed={0.5}
          minDistance={1}
          maxDistance={10}
          enablePan={true}
          target={isMobile ? [0, 0, 0] : [0, 0, 0]}
          enableRotate={false} // 禁用旋转，让PresentationControls处理
        />

        <PresentationControls
          enabled={true}
          zoom={1}
          global
          polar={[-Math.PI / 2, Math.PI / 2]} // Vertical limits
          azimuth={[-Infinity, Infinity]} // Horizontal limits
          config={{mass: 1, tension: 170, friction: 26}}
        >
          {moodMode ? <MoodSphere/> : <Earth dark={dark} isMobile={isMobile} />}
        </PresentationControls>
      </Canvas>
    </div>
  )
}