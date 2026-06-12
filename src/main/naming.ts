import path from 'node:path';
import { captureTargetSize, getAssetPreset, type AssetPresetId, type CaptureTarget } from '../shared/types';

const usedNames = new Map<string, number>();

export function fileTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

export function screenshotFileName(prefix: string, target: AssetPresetId | CaptureTarget): string {
  const captureTarget: CaptureTarget = typeof target === 'string' ? { mode: 'preset', assetId: target } : target;
  const { width, height } = captureTargetSize(captureTarget);
  const dimensions = `${width}x${height}`;
  const baseName =
    captureTarget.mode === 'preset'
      ? (() => {
          const asset = getAssetPreset(captureTarget.assetId);
          return `${asset.storeId}-${asset.kind}-${dimensions}-${prefix}-${fileTimestamp()}`;
        })()
      : `custom-${dimensions}-${prefix}-${fileTimestamp()}`;
  const count = usedNames.get(baseName) ?? 0;
  usedNames.set(baseName, count + 1);

  if (count === 0) {
    return `${baseName}.png`;
  }

  return `${baseName}-${count + 1}.png`;
}

export function outputPath(directory: string, prefix: string, target: AssetPresetId | CaptureTarget): string {
  return path.join(directory, screenshotFileName(prefix, target));
}
