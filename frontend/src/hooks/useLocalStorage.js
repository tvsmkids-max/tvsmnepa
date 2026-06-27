import { useState, useCallback } from "react";

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const v = value instanceof Function ? value(storedValue) : value;
        setStoredValue(v);
        localStorage.setItem(key, JSON.stringify(v));
      } catch (e) {
        console.error(e);
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue];
};

export default useLocalStorage;
