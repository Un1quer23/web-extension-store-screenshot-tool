import { type ResolvedTheme, type ThemeMode } from './types';

export function resolveThemeMode(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === 'system' ? systemTheme : mode;
}
