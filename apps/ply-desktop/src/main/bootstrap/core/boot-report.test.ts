import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as BootReport from './boot-report';

const logInfo = vi.fn();

vi.mock('@main/lib/logger', () => ({
  log: { info: (...args: unknown[]) => logInfo(...args), warn: vi.fn(), error: vi.fn() },
}));


describe('boot-report', () => {
  let bootReport: typeof BootReport;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    logInfo.mockClear();
    bootReport = await import('./boot-report');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits one report with both durations and phases once settled and usable', () => {
    bootReport.recordBootPhase('window', 120);
    bootReport.recordBootPhase('database', 6);
    bootReport.recordWindowVisible(410);
    bootReport.notifyBootSettledForReport();
    expect(logInfo).not.toHaveBeenCalled();

    bootReport.recordUsableWorkspace(2740);

    expect(logInfo).toHaveBeenCalledExactlyOnceWith('boot-report', {
      windowVisibleMs: 410,
      usableWorkspaceMs: 2740,
      phases: { window: 120, database: 6 },
    });
  });

  it('emits when usable arrives before boot settles', () => {
    bootReport.recordUsableWorkspace(2100);
    expect(logInfo).not.toHaveBeenCalled();

    bootReport.notifyBootSettledForReport();

    expect(logInfo).toHaveBeenCalledOnce();
  });

  it('emits without the usable duration after the grace period', async () => {
    bootReport.recordWindowVisible(400);
    bootReport.notifyBootSettledForReport();

    await vi.advanceTimersByTimeAsync(bootReport.BOOT_REPORT_GRACE_MS);

    expect(logInfo).toHaveBeenCalledExactlyOnceWith('boot-report', {
      windowVisibleMs: 400,
      usableWorkspaceMs: undefined,
      phases: {},
    });
  });

  it('never emits twice, even when the grace timer fires after emission', async () => {
    bootReport.notifyBootSettledForReport();
    bootReport.recordUsableWorkspace(3000);

    bootReport.recordUsableWorkspace(9999);
    await vi.advanceTimersByTimeAsync(bootReport.BOOT_REPORT_GRACE_MS);

    expect(logInfo).toHaveBeenCalledOnce();
    expect(logInfo.mock.calls[0][1]).toMatchObject({ usableWorkspaceMs: 3000 });
  });

  it('keeps the first usable-workspace duration', () => {
    bootReport.recordUsableWorkspace(2500);
    bootReport.recordUsableWorkspace(4000);
    bootReport.notifyBootSettledForReport();

    expect(logInfo.mock.calls[0][1]).toMatchObject({ usableWorkspaceMs: 2500 });
  });
});
