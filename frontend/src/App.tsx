import React, {useState, useEffect} from 'react'
import Sidebar from './components/Sidebar'
import RightPanel from './components/RightPanel'
import {Routes, Route, useNavigate, useLocation} from 'react-router-dom'
import { toast , Toaster} from 'sonner';
import {useTranslation} from 'react-i18next';
import api from './services/api';
import {FormData, SubmitData} from "./pages/NewDiary/types";
import Home from './pages/Home'
import Login from "./pages/Login";
import Register from "./pages/Register";
import NewDiary from "./pages/NewDiary/index";
import DiaryView from "./pages/DiaryView"
import Loading from "./components/Loading"


// @ts-ignore
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export default function App() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [dark, setDark] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true) // PC端默认显示，所以改为 true
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [showLeftRightButtonsMobile, setShowLeftRightButtonsMobile] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    navigate(-1); // 返回上一页
  };

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后的状态更新

    const checkLoginStatus = async () => {
      // 如果已经在登录或注册页面，不需要检查登录状态
      if (location.pathname === '/login' || location.pathname === '/register') {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        await api.get('/auth/me');
        if (isMounted) {
          setIsLoggedIn(true);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsLoggedIn(false);
          setLoading(false);
        }
      }
    };
    checkLoginStatus();

    // 清理函数
    return () => {
      isMounted = false;
    };
  }, [navigate, location]);

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
    console.log('location.pathname---', location.pathname)
    console.log('是不是移动端--isMobile',isMobile)
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setShowSidebar(true)
        setShowRightPanel(true)
        setShowLeftRightButtonsMobile(false)
      } else {
        setShowSidebar(false)
        setShowRightPanel(false)
        // 移动端只有首页显示左右按钮
        setShowLeftRightButtonsMobile(location.pathname === '/')
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [location.pathname])

  // 定义侧边栏的背景色
  const sidebarDayBg = '#c5d6f0';
  const sidebarNightBg = '#1A1A33';
  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

  if (loading && location.pathname !== '/login' && location.pathname !== '/register') {
    return <Loading dark={dark} />
  }

  const handleSubmitDiary = async (formData: SubmitData) => {
    setLoading(true)
    try {
      const data = {
        title: formData.title,
        content: formData.content,
        location_name: formData.location,
        entry_type: formData.type,
        coordinates: formData.coordinates,
        date_start: formData.dateStart ? formData.dateStart : '',
        date_end: formData.dateEnd ? formData.dateEnd : '',
        transportation: formData.transportation ? formData.transportation : '',
        photos: formData.photos
      };

      console.log('创建日记data---', data);

      const response = await api.post('/entries', data, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      console.log('成功发请求!!!!', response);
      toast.success(t('submit successful'));

      // 提交成功后可以导航到其他页面或显示成功消息
      setTimeout(() => {
        navigate('/');
      }, 1500);
      if(isMobile){
        setShowLeftRightButtonsMobile(true)
      }

    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error(t('Session expired, please login again'))
        navigate('/login');
      } else {
        console.error('提交 Error:', error.message);
        toast.error(t('submit error please try again'))
      }
    }finally {
      setLoading(false)
    }
  };


  return (
    <div className="h-screen flex relative">
      <Toaster
        position={"top-center"}
        theme={dark ? "dark" : "light"}
        toastOptions={{
          duration: 3000,
        }}
        richColors={true}
        visibleToasts={3}
      />

      {isMobile && showLeftRightButtonsMobile && (
        <button
          onClick={() => {
            setShowSidebar(true)
            setShowLeftRightButtonsMobile(false)
          }}
          className={`absolute top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border ${
            !isLoggedIn ? 'animate-pulse ring-2 ring-blue-500' : ''
          }`}
        >
          ☰
        </button>
      )}

      {isMobile && showLeftRightButtonsMobile && (
        <button
          onClick={() => {
            setShowRightPanel(true)
            setShowLeftRightButtonsMobile(false)
          }}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"
        >
          ✈️
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
            hideMobileButtons={() => setShowLeftRightButtonsMobile(false)}
            isLoggedIn={isLoggedIn}
          />
        </div>
      )}

      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${showSidebar && !isMobile ? 'ml-64' : 'ml-0'}`}>
        <Routes>
          <Route path="/" element={<Home dark={dark} isMobile={isMobile} showLabels={!showSidebar}/>}/>
          <Route path="/login" element={
            <Login dark={dark} isMobile={isMobile}/>
          }/>
          <Route path="/register" element={
            <Register dark={dark} isMobile={isMobile}/>
          }/>
          <Route path="/new-diary" element={
            <NewDiary
              dark={dark}
              isMobile={isMobile}
              onClose={() => {
                console.log('点击关闭')
                handleBack()
                setShowLeftRightButtonsMobile(true)
              }}
              loading={loading}
              onSubmit={(formData) => handleSubmitDiary(formData)}
            />
          }/>
          <Route path="/diary/:id" element={<DiaryView
            dark={dark}
            isMobile={isMobile}
          />}/>
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
            setShowLeftRightButtonsMobile(true)
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