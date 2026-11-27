import { describe, expect, it } from 'vitest';
import { settingsPageContributions } from '@core/manifests/browser/settings-page-contributions';
import {
  matchedTabsForQuery,
  searchSettings,
  SETTINGS_SEARCH_INDEX,
  type SettingsSearchEntry,
} from './settings-search';

const FIXTURE_INDEX: SettingsSearchEntry[] = [
  { id: 'color-mode', label: 'Color mode', tab: 'interface', keywords: ['dark mode', 'theme'] },
  { id: 'terminal-font-size', label: 'Terminal font size', tab: 'interface' },
  {
    id: 'enable-tmux',
    label: 'Enable tmux',
    tab: 'general',
    description: 'Run agent sessions and terminals in tmux sessions by default.',
  },
  { id: 'branch-prefix', label: 'Branch prefix', tab: 'repository', keywords: ['git'] },
];

describe('searchSettings', () => {
  it('returns nothing for an empty or whitespace query', () => {
    expect(searchSettings('', FIXTURE_INDEX)).toEqual([]);
    expect(searchSettings('   ', FIXTURE_INDEX)).toEqual([]);
  });

  it('matches labels case-insensitively', () => {
    const results = searchSettings('TERMINAL FONT', FIXTURE_INDEX);
    expect(results.map((entry) => entry.id)).toEqual(['terminal-font-size']);
  });

  it('matches partial substrings', () => {
    expect(searchSettings('fon', FIXTURE_INDEX).map((e) => e.id)).toEqual(['terminal-font-size']);
  });

  it('matches descriptions', () => {
    expect(searchSettings('sessions', FIXTURE_INDEX).map((e) => e.id)).toEqual(['enable-tmux']);
  });

  it('matches keywords', () => {
    expect(searchSettings('dark', FIXTURE_INDEX).map((e) => e.id)).toEqual(['color-mode']);
    expect(searchSettings('git', FIXTURE_INDEX).map((e) => e.id)).toEqual(['branch-prefix']);
  });

  it('requires every token to match (AND across tokens)', () => {
    expect(searchSettings('terminal size', FIXTURE_INDEX).map((e) => e.id)).toEqual([
      'terminal-font-size',
    ]);
    expect(searchSettings('terminal banana', FIXTURE_INDEX)).toEqual([]);
  });

  it('allows tokens to match across label, description, and keywords', () => {
    expect(searchSettings('tmux agent', FIXTURE_INDEX).map((e) => e.id)).toEqual(['enable-tmux']);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchSettings('zzz-no-such-setting', FIXTURE_INDEX)).toEqual([]);
  });

  it('ignores extra whitespace between tokens', () => {
    expect(searchSettings('  terminal   font  ', FIXTURE_INDEX).map((e) => e.id)).toEqual([
      'terminal-font-size',
    ]);
  });
});

describe('matchedTabsForQuery', () => {
  it('returns only tabs containing matches, in sidebar order', () => {
    expect(matchedTabsForQuery('terminal', FIXTURE_INDEX)).toEqual(['general', 'interface']);
  });

  it('returns a single tab when only one matches', () => {
    expect(matchedTabsForQuery('branch', FIXTURE_INDEX)).toEqual(['repository']);
  });

  it('returns no tabs for a no-result query', () => {
    expect(matchedTabsForQuery('zzz-no-such-setting', FIXTURE_INDEX)).toEqual([]);
  });

  it('returns no tabs for an empty query', () => {
    expect(matchedTabsForQuery('', FIXTURE_INDEX)).toEqual([]);
  });
});

describe('SETTINGS_SEARCH_INDEX integrity', () => {
  it('has unique ids', () => {
    const ids = SETTINGS_SEARCH_INDEX.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has kebab-case ids and non-empty labels', () => {
    for (const entry of SETTINGS_SEARCH_INDEX) {
      expect(entry.id).toMatch(/^[a-z0-9]+(-[a-z0-9.]+)*$/);
      expect(entry.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('only references known tabs', () => {
    const tabIds = new Set<string>(settingsPageContributions.map((page) => page.id));
    for (const entry of SETTINGS_SEARCH_INDEX) {
      expect(tabIds.has(entry.tab)).toBe(true);
    }
  });

  it('covers every settings tab with at least one entry', () => {
    const coveredTabs = new Set(SETTINGS_SEARCH_INDEX.map((entry) => entry.tab));
    for (const page of settingsPageContributions) {
      expect(coveredTabs.has(page.id)).toBe(true);
    }
  });

  it('routes well-known queries to the expected tabs', () => {
    expect(matchedTabsForQuery('jira')).toEqual([]);
    expect(matchedTabsForQuery('youtrack')).toEqual([]);
    expect(matchedTabsForQuery('ssh')).toEqual([]);
    expect(matchedTabsForQuery('dark mode')).toEqual(['interface']);
    expect(matchedTabsForQuery('font')).toContain('interface');
    expect(matchedTabsForQuery('worktree storage')).toEqual(['workspaces-local']);
    expect(matchedTabsForQuery('cookies')).toEqual(['browser']);
  });

  it('finds localized labels while keeping language-independent ids', () => {
    expect(searchSettings('自动生成任务名称').map((entry) => entry.id)).toEqual([
      'auto-generate-task-names',
    ]);
    expect(matchedTabsForQuery('终端字号')).toEqual(['interface']);
    expect(matchedTabsForQuery('浏览器配置')).toEqual(['browser']);
  });
});
