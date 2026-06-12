/// <reference types="vite/client" />

import type { StoreShotApi } from '../preload';

declare global {
  interface Window {
    storeShot: StoreShotApi;
  }
}
