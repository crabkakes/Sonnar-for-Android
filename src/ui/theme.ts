import { createContext, createElement, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
  border: string;
};

export const lightTheme: Theme = {
  bg: '#f6f7f9',
  surface: '#ffffff',
  text: '#14171c',
  muted: '#5c6470',
  accent: '#1a73e8',
  danger: '#c62828',
  warning: '#8a5a00',
  success: '#2e7d32',
  border: '#d9dde3',
};

export const darkTheme: Theme = {
  bg: '#0e1013',
  surface: '#181b20',
  text: '#eceef2',
  muted: '#9aa3af',
  accent: '#7ab0ff',
  danger: '#ff8a80',
  warning: '#ffcc66',
  success: '#7bd88f',
  border: '#2a2f37',
};

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  return createElement(ThemeContext.Provider, { value: scheme === 'dark' ? darkTheme : lightTheme }, children);
}

export const useTheme = (): Theme => useContext(ThemeContext);
