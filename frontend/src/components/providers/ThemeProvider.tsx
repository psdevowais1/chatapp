'use client';

import { useEffect } from 'react';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, _hasHydrated } = useThemeStore();

  useEffect(() => {
    if (_hasHydrated && theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme, _hasHydrated]);

  return <>{children}</>;
}
