import React, {useState, useEffect} from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import {Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import NewDiary from './pages/NewDiary'

// @ts-ignore
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function App() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true) // PC端默认显示，所以改为 true
  const [showRightPanel, setShowRightPanel] = useState(false)

  const handleBack = () => {
    navigate(-1); // 返回上一页
    // 或者 navigate('/'); // 返回首页
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    const loadGoogleMaps = () => {
      // @ts-ignore
      if (window.google) {
        // 如果已经存在，直接执行初始化
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;

      // 关键：添加 onload 回调
      script.onload = () => {
        // @ts-ignore
        console.log('Google Maps API 加载完毕！', window.google);
        initMap(); // 在这里调用你的初始化地图函数
      };

      script.onerror = () => {
        console.error('加载 Google Maps API 失败！');
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();

    // 清理函数，防止重复加载
    return () => {
      // 可以根据需要移除 script 标签
    };
  }, []);

// 你的初始化函数
  const initMap = () => {
    // @ts-ignore
    if (!window.google) {
      console.error('Google 对象仍然不可用。');
      return;
    }
    // 在这里安全地使用 new google.maps.Map(...) 等
    // @ts-ignore
    console.log('现在可以安全地初始化地图了。', window.google);
  };


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
            transition-transform duration-300 ease-in-out
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

      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${showSidebar && !isMobile ? 'ml-64' : 'ml-0'}`}>
        <Routes>
          <Route path="/" element={<Home dark={dark} isMobile={isMobile}/>}/>
          <Route path="/new-diary" element={
            <NewDiary
              dark={dark}
              isMobile={isMobile}
              onClose={()=>{
                console.log('点击关闭')
                handleBack()
              }}
              onSubmit={()=>{
                console.log('点击提交')}}
            />
          }/>
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

      {/*打开 sidebar button*/}
      {(!isMobile && !showSidebar) && (
        <div
          className={`absolute left-0 h-full flex flex-col justify-between items-center ${textColor}`}
          style={{backgroundColor: sidebarBg}}
        >
          <img src="/logo/logo-placeholder-image.png"
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