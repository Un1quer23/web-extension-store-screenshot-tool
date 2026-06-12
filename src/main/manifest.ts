import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ExtensionManifestInfo } from '../shared/types';

type ChromeExtensionManifest = {
  manifest_version?: number;
  action?: {
    default_popup?: string;
  };
  browser_action?: {
    default_popup?: string;
  };
  options_ui?: {
    page?: string;
  };
  options_page?: string;
};

function normalizeExtensionPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.replace(/^\/+/, '').replace(/\\/g, '/');
}

export function parseExtensionManifest(manifest: ChromeExtensionManifest): ExtensionManifestInfo {
  return {
    optionsPath: normalizeExtensionPath(manifest.options_ui?.page ?? manifest.options_page),
    popupPath: normalizeExtensionPath(
      manifest.action?.default_popup ?? manifest.browser_action?.default_popup
    )
  };
}

export async function readExtensionManifest(extensionPath: string): Promise<ExtensionManifestInfo> {
  const manifestPath = path.join(extensionPath, 'manifest.json');
  const content = await readFile(manifestPath, 'utf8');
  return parseExtensionManifest(JSON.parse(content) as ChromeExtensionManifest);
}
