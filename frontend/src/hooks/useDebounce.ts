import { useState, useEffect } from 'react';

/**
 * 自定义 Hook: useDebounce
 * @param value 需要防抖的值 (可以是 string, number, object 等)
 * @param delay 延迟时间 (毫秒)
 * @returns 防抖后的值
 */
function useDebounce<T>(value: T, delay: number): T {
  // 1. 创建一个状态来保存防抖后的值
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 2. 只有在延迟时间过后，才更新 debouncedValue
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 3. 如果在延迟时间内 value 发生了变化（或者组件卸载），
    // 清除之前的定时器，重新开始计时。
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // 只有当 value 或 delay 变化时触发

  return debouncedValue;
}

export default useDebounce;