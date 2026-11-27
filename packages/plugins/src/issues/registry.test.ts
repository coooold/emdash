import { describe, expect, it } from 'vitest';
import { issuesPluginRegistry } from './registry';

describe('issues registry', () => {
  it('does not register any hosted platform integrations', () => {
    expect(issuesPluginRegistry.ids()).toEqual([]);
    expect(issuesPluginRegistry.getAll()).toEqual([]);
  });
});
