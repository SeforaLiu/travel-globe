import React, {useState, useEffect} from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import Home from './pages/Home'
import {Routes, Route} from 'react-router-dom'

export default function App() {
  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true) // PC端默认显示，所以改为 true
  const [showRightPanel, setShowRightPanel] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // 在桌面端默认显示侧边栏和右侧面板
      if (!mobile) {
        setShowSidebar(true) // 保持默认显示
        setShowRightPanel(true)
      } else {
        setShowSidebar(false)
        setShowRightPanel(false)
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const sidebarWidthClass = isMobile
    ? 'absolute inset-y-0 left-0 z-40 w-64'
    : showSidebar
      ? 'w-[18%]' // 展开时的宽度
      : 'w-12'    // 收起时的宽度 (为了显示展开按钮)

  const mainContentWidthClass = isMobile
    ? 'w-full'
    : showSidebar
      ? 'w-[67%]'
      : 'w-[85%]' // Sidebar 缩起来后，MainContent 应该占更多空间

  return (
    <div className="h-screen flex relative">
      {/* 移动端侧边栏切换按钮  */}
      {isMobile && !showSidebar && !showRightPanel && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"
        >
          ☰
        </button>
      )}

      {/* 移动端右侧面板切换按钮 */}
      {isMobile && !showRightPanel && !showSidebar && (
        <button
          onClick={() => setShowRightPanel(true)}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"
        >
          ⚙️
        </button>
      )}

      {!isMobile && !showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute bottom-4 left-0 z-40 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-900 border-r border-t border-b rounded-r-md shadow-lg"
        >
          {`>`}
        </button>
      )}

      {(showSidebar) && (
        <div
          className={`${sidebarWidthClass} border-r bg-white dark:bg-gray-900 transition-all duration-300 overflow-hidden`}>
          <Sidebar
            dark={dark}
            setDark={setDark}
            isMobile={isMobile}
            toggleSidebar={() => setShowSidebar(!showSidebar)}
            isCollapsed={!showSidebar && !isMobile}
          />
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`${mainContentWidthClass} transition-all duration-200`}>
        <Routes>
          {/*<Route path="/" element={<Home/>}/>*/}
          <Route path="/" element={<Home dark={dark}/>}/>
          {/* 你后面可以加入 /diary/:id /guide/:id 等路由 */}
        </Routes>
      </div>

      {/* 右侧面板  */}
      {(showRightPanel || !isMobile) && (
        <div
          className={`${isMobile ? 'absolute inset-y-0 right-0 z-40 w-64' : 'w-[15%]'}  bg-white dark:bg-gray-900 transition-all duration-300`}>
          <RightPanel/>
        </div>
      )}

      {/* 移动端遮罩层  */}
      {isMobile && (showSidebar || showRightPanel) && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowSidebar(false)
            setShowRightPanel(false)
          }}
        />
      )}
   </div>
  )
}