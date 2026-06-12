import { describe, expect, it } from 'vitest';
import { resolveThemeMode } from '../src/shared/theme';

describe('theme mode resolution', () => {
  it('resolves light mode directly', () => {
    expect(resolveThemeMode('light', 'dark')).toBe('light');
  });

  it('resolves dark mode directly', () => {
    expect(resolveThemeMode('dark', 'light')).toBe('dark');
  });

  it('resolves system mode from the current system theme', () => {
    expect(resolveThemeMode('system', 'light')).toBe('light');
    expect(resolveThemeMode('system', 'dark')).toBe('dark');
  });
});
