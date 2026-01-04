// src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useTravelStore } from '@/store/useTravelStore';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { useDiarySubmission } from '@/hooks/useDiarySubmission';
import { MainLayout } from '@/layouts/MainLayout';
import Loading from '@/components/Loading';
import { NewDiaryCloseDialog } from '@/components/NewDiaryCloseDialog';

// 页面组件
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NewDiary from '@/pages/NewDiary';
import DiaryView from '@/pages/DiaryView';
import {DiaryManager} from '@/components/DiaryManager';

export default function App() {
  const [showNewDiaryCloseDialog, setShowNewDiaryCloseDialog] = useState(false);

  const navigate = useNavigate();
  const { loading, darkMode, setDarkMode, setIsMobile, isMobile, checkAuth} = useTravelStore();

  // 使用自定义 Hooks
  useGoogleMaps();
  const { submitDiary } = useDiarySubmission();

  // 主题切换
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const mobile = window.innerWidth < 768
    setIsMobile(mobile)
  }, []);

  useEffect(() => {
    checkAuth()
  }, [checkAuth]);

  // 加载状态保护
  if (loading) {
    return <Loading dark={darkMode} />;
  }

  return (
    <>
      <Toaster
        position="top-center"
        theme={darkMode ? 'dark' : 'light'}
        toastOptions={{ duration: 3000 }}
        richColors
        visibleToasts={3}
      />

      <Routes>
        <Route element={<MainLayout dark={darkMode} setDark={setDarkMode} />}>
          <Route path="/" element={<Home dark={darkMode} isMobile={isMobile}/>} />
          <Route path="/login" element={<Login dark={darkMode} isMobile={isMobile}/>} />
          <Route path="/register" element={<Register dark={darkMode} isMobile={isMobile} />} />
          <Route
            path="/new-diary"
            element={
              <NewDiary
                dark={darkMode}
                onClose={() => setShowNewDiaryCloseDialog(true)}
                onSubmit={submitDiary}
                isMobile={isMobile}
                loading={loading}
              />
            }
          />
          <Route path="/diary/:id" element={<DiaryView dark={darkMode} isMobile={isMobile}/>} />
          <Route path="/diary-manage" element={<DiaryManager />} />
        </Route>
      </Routes>


      {/* New Diary 关闭确认对话框 */}
      {showNewDiaryCloseDialog && (
        <NewDiaryCloseDialog
          dark={darkMode}
          isMobile={isMobile}
          onConfirm={() => {
            setShowNewDiaryCloseDialog(false);
            navigate(-1);
            // TODO: 清理 localStorage 缓存
          }}
          onCancel={() => setShowNewDiaryCloseDialog(false)}
        />
      )}
    </>
  );
}
