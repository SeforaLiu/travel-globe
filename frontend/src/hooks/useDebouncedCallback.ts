import { useRef, useEffect, useCallback } from 'react';

/**
 * 自定义 Hook: useDebouncedCallback
 * 返回一个经过防抖处理的函数
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<number| null>(null);
  const callbackRef = useRef(callback);

  // 保持 callback 的最新引用，防止闭包陷阱
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

export default useDebouncedCallback;