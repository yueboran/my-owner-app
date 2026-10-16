import { useState, useEffect } from 'react';

/**
 * 生产级防抖 Hook
 * @param value 需要防抖的值
 * @param delay 延迟毫秒数
 */
export function useDebounce<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
