import { describe, expect, it } from 'vitest';
import { pullRequestsPluginRegistry } from './registry';

describe('pull-requests registry', () => {
  it('does not register any hosted platform integrations', () => {
    expect(pullRequestsPluginRegistry.ids()).toEqual([]);
    expect(pullRequestsPluginRegistry.getAll()).toEqual([]);
  });
});
