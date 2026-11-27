import { describe, expect, it } from 'vitest';
import { catalogData } from './catalog';

describe('MCP catalog', () => {
  it('does not advertise retired issue platform presets', () => {
    for (const id of ['linear', 'atlassian', 'notion', 'asana', 'monday']) {
      expect(catalogData[id]).toBeUndefined();
    }
  });

  it('preserves general-purpose development tools', () => {
    expect(catalogData.playwright).toBeDefined();
    expect(catalogData.context7).toBeDefined();
  });
});
