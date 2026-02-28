import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadConfig } from '@/lib/tauri-api';

/**
 * AIDEV-NOTE: loadConfig() MUST complete before the app renders, because:
 * - player.ts reads config.__initialConfig synchronously at module-load time
 * - Zustand stores (useLibraryUIStore) read __initialConfig at definition time
 * - Without this, __initialConfig is null → TypeError crash
 *
 * We use a dynamic import() for App/Providers so their module-level side effects
 * (like the Player singleton) don't execute until config is loaded.
 */
loadConfig()
  .catch(err => {
    console.error('[harmony] Failed to load config, using defaults:', err);
  })
  .finally(async () => {
    const [{ default: App }, { default: Providers }] = await Promise.all([import('./App'), import('./Providers')]);

    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
      <React.StrictMode>
        <Providers>
          <App />
        </Providers>
      </React.StrictMode>,
    );
  });
