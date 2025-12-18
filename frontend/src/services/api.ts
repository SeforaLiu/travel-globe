// frontend/src/services/api.ts
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
    baseURL: '/api', // 与后端API前缀匹配
    timeout: 10000, // 10秒超时
    withCredentials: true // 允许携带cookie
});

// 添加一个标志来防止无限重定向
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// 请求拦截器
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const originalRequest = error.config;

        // 如果是 401 错误且不是来自 /auth/me 的请求
        if (error.response?.status === 401 && !originalRequest._retry) {
            // 特殊处理：如果是检查登录状态的请求，不要重定向
            if (originalRequest.url.includes('/auth/me')) {
                // 直接返回错误，让调用方处理
                return Promise.reject(error);
            }

            if (!isRefreshing) {
                isRefreshing = true;
                originalRequest._retry = true;

                // 重定向到登录页
                window.location.href = '/login';
            }

            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            });
        }

        return Promise.reject(error);
    }
);

export default api;