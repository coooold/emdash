import { describe, expect, it } from 'vitest';
import { integrationPluginRegistry } from './registry';

describe('integrations registry', () => {
  it('does not register any hosted platform integrations', () => {
    expect(integrationPluginRegistry.ids()).toEqual([]);
    expect(integrationPluginRegistry.getAll()).toEqual([]);
  });
});
