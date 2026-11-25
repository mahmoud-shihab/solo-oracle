import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useState that is saved on the device and restored on next launch.
 * Everything stays local; nothing is sent anywhere.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const keyRef = useRef(key);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(`solo-oracle:${key}`)
      .then((raw) => {
        if (alive && raw != null) setValue(JSON.parse(raw) as T);
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(`solo-oracle:${keyRef.current}`, JSON.stringify(value)).catch(() => {});
  }, [value, loaded]);

  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set, loaded] as const;
}
