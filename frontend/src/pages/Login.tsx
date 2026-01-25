// frontend/src/pages/Login.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast, Toaster } from 'sonner';
import { useTravelStore } from "@/store/useTravelStore";
import Loading from "@/components/Loading";
// 引入图标库，提升现代化质感
import { User, Lock, Globe, ArrowLeft } from 'lucide-react';

type Props = {
  dark: boolean;
  isMobile: boolean;
};

const Login: React.FC<Props> = ({ dark, isMobile }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const checkAuth = useTravelStore(state => state.checkAuth);
  const isLoggedIn = useTravelStore(state => state.isLoggedIn);
  const getHealth = useTravelStore(state => state.getHealth);

  useEffect(() => {
    if (isLoggedIn) navigate('/')
  }, []);

  const validateForm = () => {
    if (username.length < 6) {
      setError(t('Username must be at least 6 characters'));
      return false;
    }
    if (password.length < 6 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError(t('Password must be at least 6 characters with letters and numbers'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }
    setLoading(true);

    try {
      try {
        await getHealth();
      } catch (healthCheckError) {
        toast.error(t('No response from server'));
        return
      }

      const response = await api.post('/auth/login', { username, password });
      if (response.status === 200) {
        await checkAuth();
        toast.success(t('Login successful!'));
        navigate('/');
      }
    } catch (err: any) {
      let errorMessage = t('Login failed');
      if (err.response) {
        errorMessage = err.response.data?.detail ||
          err.response.data?.message ||
          err.response.statusText ||
          errorMessage;
      } else if (err.request) {
        errorMessage = t('No response from server');
      }

      setError(t(errorMessage));
      toast.error(t(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading dark={dark} />;
  }

  // 定义输入框的基础样式，包含 autofill 的修复
  // [&:-webkit-autofill]:shadow-[0_0_0_1000px_#HEX_inset] 是修复背景变色的关键
  const inputBaseClass = `block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors sm:text-sm`;

  const lightInputClass = `bg-white border-gray-300 text-gray-900 placeholder-gray-400 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#ffffff_inset] [&:-webkit-autofill]:-webkit-text-fill-color-black`;

  const darkInputClass = `bg-gray-800 border-gray-600 text-white placeholder-gray-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#1f2937_inset] [&:-webkit-autofill]:-webkit-text-fill-color-white`;

  return (
    // 1. 背景优化：使用深蓝渐变背景，呼应地球/星空主题，避免单调
    <div className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-300 
      ${dark
      ? 'bg-gradient-to-br from-gray-800 via-slate-700/25 to-black'
      : 'bg-gradient-to-br from-blue-100 via-white to-blue-200'
    } ${isMobile ? 'p-3' : 'p-4'}`}>

      <Toaster
        position={"top-center"}
        theme={dark ? "dark" : "light"}
        toastOptions={{ duration: 3000 }}
        richColors={true}
        visibleToasts={3}
      />

      {/* 2. 移动端 Logo 展示 */}
      {isMobile && (
        <div className="w-full pt-12 pb-6 flex flex-col items-center justify-center space-y-2 animate-fade-in-down">
          <div className={`p-3 rounded-full ${dark ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
            <Globe className={`w-8 h-8 ${dark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>
            {t('title')}
          </h1>
        </div>
      )}

      {/* 3. 卡片容器：增加 Glassmorphism (backdrop-blur) 和暗黑模式下的边框 */}
      <div
        className={`${
          isMobile
            ? 'w-full flex-1 rounded-[2rem] px-8 pt-10' // 移动端：上方圆角，占满剩余空间
            : 'w-full max-w-md p-8 rounded-2xl shadow-2xl' // PC端：卡片悬浮
        } ${
          dark
            ? 'bg-gray-900/80 backdrop-blur-md border border-gray-700/50 text-white'
            : 'bg-white/90 backdrop-blur-md shadow-xl text-gray-800'
        } transition-all duration-300`}
      >
        {!isMobile && (
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {t('Login')}
            </h2>
            <p className={`mt-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('Welcome back to your journey')}
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 flex items-center">
              <div className="text-sm text-red-500 font-medium">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            {/* Username Input with Icon */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className={`h-5 w-5 ${dark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputBaseClass} ${dark ? darkInputClass : lightInputClass}`}
                placeholder={t('Username')}
              />
            </div>

            {/* Password Input with Icon */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`h-5 w-5 ${dark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputBaseClass} ${dark ? darkInputClass : lightInputClass}`}
                placeholder={t('Password')}
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02]"
          >
            {loading ? t('Logging in...') : t('Login')}
          </button>

          {/* Register Link (Centered) */}
          <div className="flex items-center justify-center space-x-1 text-sm">
            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>
              {t('No account?')}
            </span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className={`font-semibold hover:underline ${
                dark ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              {t('Register')}
            </button>
          </div>

          {/* 1. Cancel Button: 单独一行，灰色背景，位于底部 */}
          <div className="pt-2 border-t border-gray-200/10">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`w-full flex items-center justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg transition-colors duration-200
                ${dark
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
