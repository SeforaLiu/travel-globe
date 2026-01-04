// frontend/src/pages/Register.tsx
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import api from '../services/api';
import {toast, Toaster} from 'sonner';

type Props = {
  dark: boolean;
  isMobile: boolean;
};

const Register: React.FC<Props> = ({dark, isMobile}) => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      // 使用 axios 发送请求
      const response = await api.post('/auth/register', {username, password});

      if (response.status === 200) {
        toast.success(t('Registration successful! Redirecting to login...'))
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = t(err.response?.data?.detail) || t('Registration failed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 修改容器类名，适配移动端显示
    <div
      className={`${dark ? 'bg-gray-900' : 'bg-gray-50'} ${isMobile ? 'pb-16 pt-8 px-6' : 'flex items-center justify-center px-8'} min-h-screen`}>
      <Toaster
        position={"top-center"}
        theme={dark ? "dark" : "light"}
        toastOptions={{
          duration: 3000,
        }}
        richColors={true}
        visibleToasts={3}
      />

      {/* 移动端全屏展示，桌面端保留居中卡片 */}
      <div
        className={`${
          isMobile
            ? 'w-full h-full'
            : 'w-full max-w-md mx-auto p-8 space-y-8 rounded-xl shadow-lg'
        } ${dark ? ' text-white' : 'text-gray-800'}`}
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            {t('Register')}
          </h2>
        </div>
        <form className="mt-1 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="rounded-md -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                {t('Username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  dark
                    ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-white'
                    : 'placeholder-gray-500 text-gray-900 border-gray-300'
                } rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder={t('Username')}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('Password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  dark
                    ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-white'
                    : 'placeholder-gray-500 text-gray-900 border-gray-300'
                } focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder={t('Password')}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                {t('Confirm Password')}
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  dark
                    ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-white'
                    : 'placeholder-gray-500 text-gray-900 border-gray-300'
                } rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder={t('Confirm Password')}
              />
              <p className={`mt-2 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                * {t('Password must be at least 6 characters with letters and numbers')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => navigate('/')}
                className={`font-medium ${
                  dark ? 'bg-gray-900 text-blue-400 hover:text-blue-300' : 'bg-gray-50 text-blue-600 hover:text-blue-500'
                }`}
              >
                {t('common.cancel')}
              </button>
            </div>

            <div className="text-sm">
              <span className={dark ? 'text-gray-400' : 'text-gray-600'}>
                {t('Already have an account?')}{' '}
              </span>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`font-medium ${
                  dark ? 'bg-gray-900 text-blue-400 hover:text-blue-300' : 'bg-gray-50 text-blue-600 hover:text-blue-500'
                }`}
              >
                {t('Login')}
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('Register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
