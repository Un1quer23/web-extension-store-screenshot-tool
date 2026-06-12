import { existsSync as defaultExistsSync } from 'node:fs';
import path from 'node:path';
import { type BrowserRuntime } from '../shared/types';

type RuntimeOptions = {
  env?: NodeJS.ProcessEnv;
  existsSync?: (candidate: string) => boolean;
  platform?: NodeJS.Platform;
};

function compactCandidates(candidates: Array<string | undefined>): string[] {
  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
}

function windowsCandidates(env: NodeJS.ProcessEnv): BrowserRuntime[] {
  const programFiles = env.ProgramFiles;
  const programFilesX86 = env['ProgramFiles(x86)'];
  const localAppData = env.LOCALAPPDATA;

  return [
    ...compactCandidates([
      programFiles ? path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe') : undefined,
      programFilesX86 ? path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe') : undefined,
      localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : undefined
    ]).map((executablePath) => ({ name: 'Chrome' as const, executablePath })),
    ...compactCandidates([
      programFiles ? path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : undefined,
      programFilesX86 ? path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : undefined,
      localAppData ? path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe') : undefined
    ]).map((executablePath) => ({ name: 'Edge' as const, executablePath }))
  ];
}

function fallbackCandidates(): BrowserRuntime[] {
  return [
    { name: 'Chrome', executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' },
    { name: 'Edge', executablePath: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
    { name: 'Chrome', executablePath: '/usr/bin/google-chrome' },
    { name: 'Chrome', executablePath: '/usr/bin/google-chrome-stable' },
    { name: 'Edge', executablePath: '/usr/bin/microsoft-edge' }
  ];
}

export function findBrowserRuntime(options: RuntimeOptions = {}): BrowserRuntime | undefined {
  const env = options.env ?? process.env;
  const existsSync = options.existsSync ?? defaultExistsSync;
  const platform = options.platform ?? process.platform;
  const candidates = platform === 'win32' ? windowsCandidates(env) : fallbackCandidates();

  return candidates.find((candidate) => existsSync(candidate.executablePath));
}

export function requireBrowserRuntime(options: RuntimeOptions = {}): BrowserRuntime {
  const runtime = findBrowserRuntime(options);
  if (!runtime) {
    throw new Error('Chrome or Microsoft Edge was not found. Install Chrome or Edge, then try again.');
  }

  return runtime;
}
