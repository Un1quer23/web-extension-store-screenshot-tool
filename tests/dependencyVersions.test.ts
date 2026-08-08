import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';

const require = createRequire(import.meta.url);
const reactPackage = require('react/package.json') as { version: string };
const reactDomPackage = require('react-dom/package.json') as { version: string };

describe('React dependency versions', () => {
  it('pins React and ReactDOM to the same exact version', () => {
    const reactVersion = packageJson.dependencies.react;
    const reactDomVersion = packageJson.dependencies['react-dom'];

    expect(reactVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(reactDomVersion).toBe(reactVersion);
  });

  it('installs the exact declared React and ReactDOM versions', () => {
    expect(reactPackage.version).toBe(packageJson.dependencies.react);
    expect(reactDomPackage.version).toBe(packageJson.dependencies['react-dom']);
  });
});
