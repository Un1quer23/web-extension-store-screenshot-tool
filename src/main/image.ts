import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true });
}

export async function writePng(buffer: Buffer, outputPath: string): Promise<string> {
  await ensureDirectory(path.dirname(outputPath));
  await sharp(buffer).png().toFile(outputPath);
  return outputPath;
}

export async function copyPng(sourcePath: string, destinationPath: string): Promise<string> {
  await ensureDirectory(path.dirname(destinationPath));
  await copyFile(sourcePath, destinationPath);
  return destinationPath;
}

export async function pngDataUrlFromFile(imagePath: string): Promise<string> {
  const image = await readFile(imagePath);
  return `data:image/png;base64,${image.toString('base64')}`;
}
