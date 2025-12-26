import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const themes = {
  violet: {
    name: 'Electric Violet',
    colors: {
      primary: '#6D28D9',
      secondary: '#8B5CF6',
      accent: '#C4B5FD',
      background: 'from-slate-50 to-violet-50',
      isDark: false,
    }
  },
  ocean: {
    name: 'Ocean Blue',
    colors: {
      primary: '#0EA5E9',
      secondary: '#38BDF8',
      accent: '#BAE6FD',
      background: 'from-blue-50 to-cyan-50',
      isDark: false,
    }
  },
  forest: {
    name: 'Forest Green',
    colors: {
      primary: '#10B981',
      secondary: '#34D399',
      accent: '#A7F3D0',
      background: 'from-green-50 to-emerald-50',
      isDark: false,
    }
  },
  sunset: {
    name: 'Warm Coral',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      accent: '#FED7AA',
      background: 'from-orange-50 to-rose-50',
      isDark: false,
    }
  },
  rose: {
    name: 'Rose Pink',
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#FBCFE8',
      background: 'from-pink-50 to-rose-50',
      isDark: false,
    }
  },
  dark: {
    name: 'Dark Mode',
    colors: {
      primary: '#8B5CF6',
      secondary: '#A78BFA',
      accent: '#C4B5FD',
      background: 'from-gray-900 to-gray-800',
      isDark: true,
    }
  },
};

// Helper function to convert hex to RGB values
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
    : '109 40 217';
};

// Apply theme to CSS variables
const applyThemeToDOM = (themeName) => {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  
  // Apply primary color
  root.style.setProperty('--primary', hexToRgb(theme.colors.primary));
  root.style.setProperty('--ring', hexToRgb(theme.colors.primary));
  
  // Apply accent color
  root.style.setProperty('--accent', hexToRgb(theme.colors.accent));
  
  // Apply dark mode class
  if (theme.colors.isDark) {
    document.body.classList.add('dark-theme');
    root.style.setProperty('--background', '15 23 42');
    root.style.setProperty('--foreground', '248 250 252');
    root.style.setProperty('--card', '30 41 59');
    root.style.setProperty('--card-foreground', '248 250 252');
  } else {
    document.body.classList.remove('dark-theme');
    root.style.setProperty('--background', '248 250 252');
    root.style.setProperty('--foreground', '15 23 42');
    root.style.setProperty('--card', '255 255 255');
    root.style.setProperty('--card-foreground', '15 23 42');
  }
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      currentTheme: 'violet',
      theme: themes.violet,
      themes: themes,
      
      setTheme: (themeName) => {
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
    }),
    {
      name: 'smartstudy-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme when store rehydrates from localStorage
        if (state?.currentTheme) {
          setTimeout(() => applyThemeToDOM(state.currentTheme), 0);
        }
      },
    }
  )
);
