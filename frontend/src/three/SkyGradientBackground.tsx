import {useThree} from '@react-three/fiber'
import * as THREE from 'three'
import {useEffect} from 'react'

type Props = {
  dark: boolean;
};

export function SkyGradientBackground({dark}: Props) {
  const {scene} = useThree()

  useEffect(() => {
    // 定义白天和黑夜的颜色
    const dayColors = {
      top: '#00008B', // Deep Blue (顶部)
      bottom: '#87CEFA', // Light Sky Blue (底部)
    }

    const nightColors = {
      top: '#000000', // Black (顶部)
      bottom: '#282840', // Darker night sky color (底部) - 你可以根据喜好调整
    }

    const colors = dark ? nightColors : dayColors

    // 创建一个从上到下的渐变
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 256
    const context = canvas.getContext('2d')

    // 定义渐变颜色：根据 dark 状态选择颜色
    const gradient = context!.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, colors.top)
    gradient.addColorStop(1, colors.bottom)

    context!.fillStyle = gradient
    context!.fillRect(0, 0, 1, canvas.height)

    // 创建纹理并应用为场景背景
    const backgroundTexture = new THREE.CanvasTexture(canvas)
    // 确保纹理正确更新
    backgroundTexture.needsUpdate = true;
// 确保纹理的色彩空间正确
    backgroundTexture.colorSpace = THREE.SRGBColorSpace; // 推荐使用 sRGB

    scene.background = backgroundTexture

    // 清理函数
    return () => {
      scene.background = null
      backgroundTexture.dispose() // 释放纹理内存
    }
  }, [scene, dark]) // 依赖项中加入 dark

  return null
}