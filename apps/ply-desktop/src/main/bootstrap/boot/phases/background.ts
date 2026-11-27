import { systemPreferences } from 'electron';
import type { DesktopRuntimes } from '@main/gateway/desktop-runtimes';
import { log } from '@main/lib/logger';
import { runInBackground } from '../../core/background';
import { startMainDevPerfInstruments } from './dev-perf';
import { initializeUpdater } from './updater';

export function bootBackground(runtimes: DesktopRuntimes): void {
  startMainDevPerfInstruments();

  // Updater init hits the network and must never block the boot chain; it
  // moved out of preflight under the window-first boot (spec build issue 2).
  runInBackground('updater-initialize', initializeUpdater);

  runInBackground('dependency-probe', async () => {
    await runtimes.clients.hostDependencies.snapshot.mutate('refresh', {
      key: undefined,
      input: {},
    });
  });

  if (
    process.platform === 'darwin' &&
    systemPreferences.getMediaAccessStatus('microphone') !== 'granted'
  ) {
    runInBackground('microphone-permission', async () => {
      const granted = await systemPreferences.askForMediaAccess('microphone');
      log.info('Microphone access request resolved:', { granted });
    });
  }
}
