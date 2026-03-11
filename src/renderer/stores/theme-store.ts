import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const THEME_VARS = {
  dark: {
    '--bg-primary': '#1a1b26',
    '--bg-secondary': '#24283b',
    '--bg-terminal': '#1a1b26',
    '--bg-header': '#1f2335',
    '--bg-toolbar': '#16161e',
    '--bg-hover': '#292e42',
    '--text-primary': '#c0caf5',
    '--text-secondary': '#565f89',
    '--text-accent': '#7aa2f7',
    '--border-color': '#292e42',
    '--accent-color': '#7aa2f7',
    '--danger-color': '#f7768e',
    '--success-color': '#9ece6a',
    '--warning-color': '#e0af68',
    '--info-color': '#7dcfff',
  },
  light: {
    '--bg-primary': '#f5f5f5',
    '--bg-secondary': '#ffffff',
    '--bg-terminal': '#ffffff',
    '--bg-header': '#e8e8e8',
    '--bg-toolbar': '#f0f0f0',
    '--bg-hover': '#e0e0e0',
    '--text-primary': '#333333',
    '--text-secondary': '#888888',
    '--text-accent': '#1a73e8',
    '--border-color': '#d0d0d0',
    '--accent-color': '#1a73e8',
    '--danger-color': '#d32f2f',
    '--success-color': '#388e3c',
    '--warning-color': '#f57c00',
    '--info-color': '#0288d1',
  },
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'dark',

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);
  },

  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      return { theme: newTheme };
    }),
}));

function applyTheme(theme: Theme) {
  const vars = THEME_VARS[theme];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
