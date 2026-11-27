import { describe, expect, it } from 'vitest';
import { repositoryPluginRegistry } from './registry';

describe('repository registry', () => {
  it('does not register any hosted platform integrations', () => {
    expect(repositoryPluginRegistry.ids()).toEqual([]);
    expect(repositoryPluginRegistry.getAll()).toEqual([]);
  });
});
