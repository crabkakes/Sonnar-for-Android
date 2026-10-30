import { useWindowDimensions } from 'react-native';

export function useLayout(): { columns: number; maxContentWidth: number; isWide: boolean } {
  const { width } = useWindowDimensions();
  if (width < 600) return { columns: 1, maxContentWidth: width, isWide: false };
  return { columns: Math.floor(width / 180), maxContentWidth: 1100, isWide: true };
}
