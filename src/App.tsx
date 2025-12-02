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

  // 定义侧边栏的背景色
  const sidebarDayBg = '#c5d6f0';
  const sidebarNightBg = '#1A1A33';
  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

  return (
    <div className="h-screen flex relative">
      {isMobile && !showSidebar && !showRightPanel && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"
        >
          ☰
        </button>
      )}

      {isMobile && !showRightPanel && !showSidebar && (
        <button
          onClick={() => setShowRightPanel(true)}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"
        >
          ⚙️
        </button>
      )}

      {showSidebar && (
        <div
          className={`
            fixed inset-y-0 left-0 z-40 
            w-64 
            bg-white dark:bg-gray-900 
            transition-transform duration-300
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar
            dark={dark}
            setDark={setDark}
            isMobile={isMobile}
            toggleSidebar={() => setShowSidebar(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Home dark={dark}/>}/>
        </Routes>
      </div>

      {(showRightPanel || !isMobile) && (
        <div
          className={`${isMobile} ? 'absolute inset-y-0 right-0 z-40 w-64' : 'w-[10%] flex-shrink-0' bg-amber-50 dark:bg-gray-900 transition-all duration-300`}>
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

      {/*打开 sidebar*/}
      {(!isMobile && !showSidebar) && (
        <div
          className={`absolute left-0 h-full flex flex-col justify-between items-center ${textColor}`}
          style={{backgroundColor: sidebarBg}}
        >
          <img src="https://www.largeherds.co.za/wp-content/uploads/2024/01/logo-placeholder-image.png"
               alt="logo"
               className="rounded w-10"
          />
          <button
            onClick={() => setShowSidebar(true)}
            className="px-4 py-1 opacity-50 hover:opacity-100"
          >
            {`>`}
          </button>
        </div>
      )
      }
    </div>
  )
}