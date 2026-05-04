import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getUserTimezone,
  isValidTimezone,
  setUserTimezone as persistTimezone
} from '../lib/timezone';

interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => void;
}

const TimezoneContext = createContext<TimezoneContextValue | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState<string>(() => getUserTimezone());

  const update = useCallback((tz: string) => {
    if (!isValidTimezone(tz)) return;
    persistTimezone(tz);
    setTimezone(tz);
  }, []);

  const value = useMemo(() => ({ timezone, setTimezone: update }), [timezone, update]);

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used within TimezoneProvider');
  return ctx;
}
