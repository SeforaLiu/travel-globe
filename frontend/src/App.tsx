// src/App.tsx
import React, {useState, useEffect, useCallback} from 'react'; // 引入 useCallback
import {Routes, Route, useNavigate, useLocation} from 'react-router-dom';
import {toast, Toaster} from 'sonner';
import {useTravelStore} from '@/store/useTravelStore';
import {useDiarySubmission} from '@/hooks/useDiarySubmission';
import {MainLayout} from '@/layouts/MainLayout';
import Loading from '@/components/Loading';
import {NewDiaryCloseDialog} from '@/components/NewDiaryCloseDialog';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NewDiary from '@/pages/NewDiary';
import DiaryView from '@/pages/DiaryView';
import {DiaryManager} from '@/components/DiaryManager';
import {LogoutDialog} from "@/components/LogoutDialog";

export default function App() {
  const location = useLocation();
  const [showNewDiaryCloseDialog, setShowNewDiaryCloseDialog] = useState(false);
  const [shouldFetchDiaryDetail, setShouldFetchDiaryDetail] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const navigate = useNavigate();
  const loading = useTravelStore(state => state.loading);
  const darkMode = useTravelStore(state => state.darkMode);
  const setDarkMode = useTravelStore(state => state.setDarkMode);
  const setIsMobile = useTravelStore(state => state.setIsMobile);
  const isMobile = useTravelStore(state => state.isMobile);
  const logout = useTravelStore(state => state.logout);

  const {submitDiary, isSubmitting} = useDiarySubmission();

  const handleNewDiaryClose = useCallback(() => {
    setShowNewDiaryCloseDialog(true);
  }, []);

  const handleClickLogout = useCallback(() => {
    setShowLogoutDialog(true)
  }, [])


  const handleConfirmLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Network error");
    }
  };

  // 主题切换
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  // 加载状态保护
  if (loading) {
    return <Loading dark={darkMode}/>;
  }

  return (
    <>
      <Toaster
        position="top-center"
        theme={darkMode ? 'dark' : 'light'}
        toastOptions={{duration: 3000}}
        richColors
        visibleToasts={3}
      />

      <Routes>
        <Route element={<MainLayout dark={darkMode} setDark={setDarkMode} handleClickLogout={handleClickLogout}/>}>
          <Route path="/" element={<Home dark={darkMode} isMobile={isMobile}/>}/>
          <Route path="/login" element={<Login dark={darkMode} isMobile={isMobile}/>}/>
          <Route path="/register" element={<Register dark={darkMode} isMobile={isMobile}/>}/>

          {/* 创建新日记的路由 */}
          <Route
            path="/new-diary"
            element={
              <NewDiary
                dark={darkMode}
                onClose={handleNewDiaryClose} // 使用 useCallback 包装后的稳定函数
                onSubmit={submitDiary}
                isMobile={isMobile}
                loading={isSubmitting}
              />
            }
          />
          <Route
            path="/diary/edit"
            element={
              <NewDiary
                dark={darkMode}
                onClose={handleNewDiaryClose} // 复用同一个稳定函数
                onSubmit={submitDiary}
                isMobile={isMobile}
                loading={isSubmitting}
                shouldFetchDiaryDetail={shouldFetchDiaryDetail}
              />
            }
          />

          <Route path="/diary/:id" element={<DiaryView dark={darkMode} isMobile={isMobile}/>}/>
          <Route path="/diary-manage" element={<DiaryManager/>}/>
        </Route>
      </Routes>

      {/* New Diary 关闭确认对话框 */}
      {showNewDiaryCloseDialog && (
        <NewDiaryCloseDialog
          dark={darkMode}
          isMobile={isMobile}
          onConfirm={() => {
            setShowNewDiaryCloseDialog(false);
            if (location.pathname === '/diary/edit'){
              setShouldFetchDiaryDetail(true)
              navigate(-1);
            }else{
              navigate('/');
            }
          }}
          onCancel={() => setShowNewDiaryCloseDialog(false)}
        />
      )}

      {/* 退出登录之前的确认框 */}
      {showLogoutDialog && (
        <LogoutDialog
          dark={darkMode}
          isMobile={isMobile}
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutDialog(false)}
        />
      )}
    </>
  );
}
