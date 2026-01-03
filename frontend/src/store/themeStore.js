import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const themes = {
  violet: {
    name: 'Electric Violet',
    colors: {
      primary: '#6D28D9',
      secondary: '#8B5CF6',
      accent: '#C4B5FD',
      primaryLight: '#EDE9FE',
      gradientFrom: '#f8fafc',
      gradientTo: '#ede9fe',
      isDark: false,
    },
    tailwind: {
      primary: 'violet',
      gradient: 'from-slate-50 to-violet-50',
      buttonBg: 'bg-violet-600 hover:bg-violet-700',
      buttonOutline: 'border-violet-200 text-violet-600 hover:bg-violet-50',
      cardBorder: 'border-violet-200',
      iconColor: '#6D28D9',
    }
  },
  ocean: {
    name: 'Ocean Blue',
    colors: {
      primary: '#0EA5E9',
      secondary: '#38BDF8',
      accent: '#BAE6FD',
      primaryLight: '#E0F2FE',
      gradientFrom: '#f0f9ff',
      gradientTo: '#e0f2fe',
      isDark: false,
    },
    tailwind: {
      primary: 'sky',
      gradient: 'from-blue-50 to-cyan-50',
      buttonBg: 'bg-sky-600 hover:bg-sky-700',
      buttonOutline: 'border-sky-200 text-sky-600 hover:bg-sky-50',
      cardBorder: 'border-sky-200',
      iconColor: '#0EA5E9',
    }
  },
  forest: {
    name: 'Forest Green',
    colors: {
      primary: '#10B981',
      secondary: '#34D399',
      accent: '#A7F3D0',
      primaryLight: '#D1FAE5',
      gradientFrom: '#f0fdf4',
      gradientTo: '#d1fae5',
      isDark: false,
    },
    tailwind: {
      primary: 'emerald',
      gradient: 'from-green-50 to-emerald-50',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      buttonOutline: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
      cardBorder: 'border-emerald-200',
      iconColor: '#10B981',
    }
  },
  sunset: {
    name: 'Warm Coral',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      accent: '#FED7AA',
      primaryLight: '#FFEDD5',
      gradientFrom: '#fff7ed',
      gradientTo: '#fed7aa',
      isDark: false,
    },
    tailwind: {
      primary: 'orange',
      gradient: 'from-orange-50 to-amber-50',
      buttonBg: 'bg-orange-600 hover:bg-orange-700',
      buttonOutline: 'border-orange-200 text-orange-600 hover:bg-orange-50',
      cardBorder: 'border-orange-200',
      iconColor: '#F97316',
    }
  },
  rose: {
    name: 'Rose Pink',
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#FBCFE8',
      primaryLight: '#FCE7F3',
      gradientFrom: '#fdf2f8',
      gradientTo: '#fce7f3',
      isDark: false,
    },
    tailwind: {
      primary: 'pink',
      gradient: 'from-pink-50 to-rose-50',
      buttonBg: 'bg-pink-600 hover:bg-pink-700',
      buttonOutline: 'border-pink-200 text-pink-600 hover:bg-pink-50',
      cardBorder: 'border-pink-200',
      iconColor: '#EC4899',
    }
  },
  dark: {
    name: 'Dark Mode',
    colors: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#C4B5FD',
      primaryLight: '#1e293b',
      gradientFrom: '#0f172a',
      gradientTo: '#1e293b',
      isDark: true,
    },
    tailwind: {
      primary: 'violet',
      gradient: 'from-slate-900 to-slate-800',
      buttonBg: 'bg-violet-600 hover:bg-violet-700',
      buttonOutline: 'border-violet-400 text-violet-400 hover:bg-slate-700',
      cardBorder: 'border-slate-600',
      iconColor: '#A78BFA',
    }
  },
};

// Apply theme to document
const applyThemeToDOM = (themeName) => {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  const body = document.body;
  
  // Set CSS custom properties for colors
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-accent', theme.colors.accent);
  root.style.setProperty('--theme-primary-light', theme.colors.primaryLight);
  root.style.setProperty('--theme-gradient-from', theme.colors.gradientFrom);
  root.style.setProperty('--theme-gradient-to', theme.colors.gradientTo);
  
  // Apply background gradient to body
  body.style.background = `linear-gradient(to bottom right, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})`;
  body.style.minHeight = '100vh';
  
  // Dark mode handling
  if (theme.colors.isDark) {
    body.classList.add('dark-theme');
    root.style.setProperty('--theme-text', '#f8fafc');
    root.style.setProperty('--theme-text-muted', '#94a3b8');
    root.style.setProperty('--theme-card-bg', '#1e293b');
    root.style.setProperty('--theme-card-border', '#334155');
  } else {
    body.classList.remove('dark-theme');
    root.style.setProperty('--theme-text', '#1f2937');
    root.style.setProperty('--theme-text-muted', '#6b7280');
    root.style.setProperty('--theme-card-bg', '#ffffff');
    root.style.setProperty('--theme-card-border', '#e5e7eb');
  }
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      currentTheme: 'violet',
      theme: themes.violet,
      themes: themes,
      
      setTheme: (themeName) => {
        applyThemeToDOM(themeName);
        set({ 
          currentTheme: themeName,
          theme: themes[themeName] 
        });
      },
      
      applyTheme: (themeName) => {
        const name = themeName || get().currentTheme;
        applyThemeToDOM(name);
        set({ 
          currentTheme: name,
          theme: themes[name] 
        });
      },
      
      initTheme: () => {
        const currentTheme = get().currentTheme;
        applyThemeToDOM(currentTheme);
      },

      // Helper to get dynamic classes
      getButtonClass: (variant = 'primary') => {
        const theme = get().theme;
        if (variant === 'primary') {
          return theme.tailwind.buttonBg;
        }
        return theme.tailwind.buttonOutline;
      },

      getIconColor: () => {
        return get().theme.tailwind.iconColor;
      },
    }),
    {
      name: 'smartstudy-theme',
      onRehydrateStorage: () => (state) => {
        if (state?.currentTheme) {
          setTimeout(() => applyThemeToDOM(state.currentTheme), 0);
        }
      },
    }
  )
);
