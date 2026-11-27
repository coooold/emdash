# Retired Hosted-Platform Integrations

This branch does not support application-managed GitHub, GitLab, or issue-platform
accounts. All hosted integration, issue, repository, and PR/MR provider implementations
have been removed, along with their SDK dependencies and credential migrations.
The PR background worker and hosted repository creation flow are also removed.

Removed issue platforms include Linear, Jira, Plane, Plain, Featurebase, Asana,
Monday, Trello, Notion, and YouTrack. No legacy `emdash-*-token` or credentials-key
importer for these platforms remains.

## Supported local workflows

- Open or initialize a local Git repository.
- Clone an existing Git URL using the machine's native Git credentials.
- Use worktrees, diffs, commits, fetch, pull, and push independently of a hosting provider.
- Agent and terminal sessions honor the `none` credentials setting; otherwise they use
  native system credentials. Legacy `effective-account` settings fall back to `system`.
- Requests that explicitly select a managed account fail instead of silently switching
  to a different identity.

## Compatibility boundaries

Generic plugin interfaces, legacy issue/PR snapshot schemas, and account-setting JSON
shapes remain to keep existing project/task records readable. The four hosted-platform
plugin registries are empty. The legacy integrations Wire endpoint returns no providers
or accounts and rejects connection requests; no auth or credential migration runs.
Do not restore a provider by adding it to one of these registries.

Existing local databases and secret-store records are not deleted by this change.
Numbered SQL migrations and historical migration fixtures must not be rewritten.

GitHub URLs used for this project's source hosting, public skill catalog downloads,
release/update metadata, or maintainer packaging workflows are not user-repository
integrations and remain. Octokit is a desktop development dependency for release
scripts only, not an application runtime dependency.

Generic user-configured MCP servers remain supported. Built-in MCP presets for the
retired issue platforms are removed; saved user configurations are not changed.
