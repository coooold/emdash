import { describe, expect, it } from 'vitest';
import { settingsPageTabSchema, settingsViewDef } from '@core/features/settings/contributions/views';
import { settingsPageContributions } from './settings-page-contributions';

describe('settings page contribution manifest', () => {
  it('defines each internal settings tab once and in schema order', () => {
    const ids = settingsPageContributions.map(({ id }) => id);
    const internalTabs = settingsPageTabSchema.options.filter((id) => id !== 'docs');

    expect(ids).toEqual(internalTabs);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reopens a saved SSH connections page on General', () => {
    expect(settingsViewDef.safeRef({ tab: 'connections', detail: ['old-host'] })?.params.tab).toBe(
      'general'
    );
    expect(settingsPageContributions.map(({ id }) => id)).not.toContain('connections');
  });
});
