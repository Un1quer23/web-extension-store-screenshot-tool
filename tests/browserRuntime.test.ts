import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBrowserRuntime, requireBrowserRuntime } from '../src/main/browserRuntime';

const env = {
  ProgramFiles: 'C:\\Program Files',
  'ProgramFiles(x86)': 'C:\\Program Files (x86)',
  LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local'
};

describe('browser runtime resolution', () => {
  it('prefers Chrome when Chrome and Edge are both installed', () => {
    const chrome = path.join(env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe');
    const edge = path.join(env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe');

    const runtime = findBrowserRuntime({
      env,
      platform: 'win32',
      existsSync: (candidate) => candidate === chrome || candidate === edge
    });

    expect(runtime).toEqual({ name: 'Chrome', executablePath: chrome });
  });

  it('falls back to Edge when Chrome is not installed', () => {
    const edge = path.join(env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe');

    const runtime = findBrowserRuntime({
      env,
      platform: 'win32',
      existsSync: (candidate) => candidate === edge
    });

    expect(runtime).toEqual({ name: 'Edge', executablePath: edge });
  });

  it('throws a clear error when no supported browser is installed', () => {
    expect(() =>
      requireBrowserRuntime({
        env,
        platform: 'win32',
        existsSync: () => false
      })
    ).toThrow('Chrome or Microsoft Edge was not found. Install Chrome or Edge, then try again.');
  });
});
