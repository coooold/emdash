import { describe, expect, it } from 'vitest';
import { resolveInstanceRemote, resolveRemoteRepository } from './repository-remote';

const instanceUrl = 'https://code.example.com';

describe('resolveInstanceRemote', () => {
  it('parses a remote on the configured instance', () => {
    expect(
      resolveInstanceRemote('https://code.example.com/group/sub/repo.git', instanceUrl, 'GitLab')
    ).toEqual({
      success: true,
      data: { host: 'code.example.com', slug: 'group/sub/repo' },
    });
  });

  it('requires a repository URL', () => {
    expect(resolveInstanceRemote(undefined, instanceUrl, 'GitLab')).toEqual({
      success: false,
      error: { type: 'invalid_input', message: 'Repository URL is required.' },
    });
    expect(resolveInstanceRemote('   ', instanceUrl, 'GitLab')).toEqual({
      success: false,
      error: { type: 'invalid_input', message: 'Repository URL is required.' },
    });
  });

  it('requires a parseable repository URL', () => {
    expect(resolveInstanceRemote('not-a-remote', instanceUrl, 'GitLab')).toEqual({
      success: false,
      error: { type: 'invalid_input', message: 'Unable to parse repository URL.' },
    });
  });

  it('requires the remote host to match the configured instance', () => {
    expect(
      resolveInstanceRemote('https://other.example.com/org/repo.git', instanceUrl, 'GitLab')
    ).toEqual({
      success: false,
      error: {
        type: 'unsupported_host',
        message:
          'Git remote host "other.example.com" does not match configured GitLab instance "code.example.com".',
      },
    });
  });

  it('rejects an invalid instance URL', () => {
    expect(
      resolveInstanceRemote('https://code.example.com/org/repo.git', 'not a url', 'GitLab')
    ).toEqual({
      success: false,
      error: { type: 'invalid_input', message: 'A valid GitLab instance URL is required.' },
    });
  });

  it('parses a remote on an instance with a non-default port (#3395)', () => {
    expect(
      resolveInstanceRemote(
        'http://192.0.2.10:3100/owner/repo.git',
        'http://192.0.2.10:3100',
        'GitLab'
      )
    ).toEqual({
      success: true,
      data: { host: '192.0.2.10:3100', slug: 'owner/repo' },
    });
    expect(
      resolveRemoteRepository(
        'http://192.0.2.10:3100/owner/repo.git',
        'http://192.0.2.10:3100',
        'GitLab'
      )
    ).toEqual({
      success: true,
      data: { owner: 'owner', repo: 'repo', slug: 'owner/repo' },
    });
  });
});

describe('resolveRemoteRepository', () => {
  it('resolves an owner/repo repository from an HTTPS remote', () => {
    expect(
      resolveRemoteRepository('https://code.example.com/org/repo.git', instanceUrl, 'GitLab')
    ).toEqual({
      success: true,
      data: { owner: 'org', repo: 'repo', slug: 'org/repo' },
    });
  });

  it('resolves an owner/repo repository from an scp-like SSH remote', () => {
    expect(
      resolveRemoteRepository('git@code.example.com:org/repo.git', instanceUrl, 'GitLab')
    ).toEqual({
      success: true,
      data: { owner: 'org', repo: 'repo', slug: 'org/repo' },
    });
  });

  it('rejects nested repository slugs', () => {
    expect(
      resolveRemoteRepository('https://code.example.com/org/team/repo.git', instanceUrl, 'GitLab')
    ).toEqual({
      success: false,
      error: { type: 'invalid_input', message: 'Unable to extract owner/repo from remote URL.' },
    });
  });
});
