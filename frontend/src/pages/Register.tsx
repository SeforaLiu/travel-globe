// frontend/src/pages/Register.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast, Toaster } from 'sonner';
import { useTravelStore } from "@/store/useTravelStore";
import Loading from "@/components/Loading";
// 引入图标
import { User, Lock, Globe, ArrowLeft, CheckCircle } from 'lucide-react';

type Props = {
  dark: boolean;
  isMobile: boolean;
};

const Register: React.FC<Props> = ({ dark, isMobile }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (password !== confirmPassword) {
      setError(t('Passwords do not match'));
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

      const response = await api.post('/auth/register', { username, password });

      if (response.status === 200) {
        toast.success(t('Registration successful! Redirecting to login...'))
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      let errorMessage = t('Registration failed');
      if (err.response && err.response.data) {
        const detail = err.response.data.detail;
        if (detail) {
          errorMessage = t(detail);
        }
      } else if (err.request) {
        errorMessage = t('No response from server');
      }
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Registration error:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading dark={dark} />;
  }

  // 复用样式逻辑
  const inputBaseClass = `block w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors sm:text-sm`;
  const lightInputClass = `bg-white border-gray-300 text-gray-900 placeholder-gray-400 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#ffffff_inset] [&:-webkit-autofill]:-webkit-text-fill-color-pink`;
  const darkInputClass = `bg-gray-800 border-gray-600 text-white placeholder-gray-500 [&:-webkit-autofill]:shadow-[0_0_0_1000px_#1f2937_inset] [&:-webkit-autofill]:-webkit-text-fill-color-red`;

  return (
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

      {/* Mobile Header */}
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

      <div
        className={`${
          isMobile
            ? 'w-full flex-1 rounded-[2rem] px-8 pt-10'
            : 'w-full max-w-md p-8 rounded-2xl shadow-2xl'
        } ${
          dark
            ? 'bg-gray-900/80 backdrop-blur-md border border-gray-700/50 text-white'
            : 'bg-white/90 backdrop-blur-md shadow-xl text-gray-800'
        } transition-all duration-300`}
      >
        {!isMobile && (
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {t('Register')}
            </h2>
            <p className={`mt-2 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('Create your account to start exploring')}
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

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CheckCircle className={`h-5 w-5 ${dark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`${inputBaseClass} ${dark ? darkInputClass : lightInputClass}`}
                placeholder={t('Confirm Password')}
              />
            </div>

            {/* 提示信息优化 */}
            <div className="space-y-1 px-1">
              <p className={`text-xs flex items-center ${dark ? 'text-blue-400' : 'text-blue-600'}`}>
                • {t('Username cannot be modified later')}
              </p>
              <p className={`text-xs flex items-center ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                • {t('Password must be at least 6 characters with letters and numbers')}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02]"
          >
            {t('Register')}
          </button>

          <div className="flex items-center justify-center space-x-1 text-sm">
            <span className={dark ? 'text-gray-400' : 'text-gray-500'}>
              {t('Already have an account?')}
            </span>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className={`font-semibold hover:underline ${
                dark ? 'text-blue-400' : 'text-blue-600'
              }`}
            >
              {t('Login')}
            </button>
          </div>

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

export default Register;
