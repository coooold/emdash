const releaseRepository = (import.meta as ImportMeta & { env?: { VITE_RELEASE_REPOSITORY?: string } })
  .env?.VITE_RELEASE_REPOSITORY ?? 'generalaction/emdash';

export const EMDASH_RELEASES_URL = `https://github.com/${releaseRepository}/releases`;
export const EMDASH_RELEASES_API_URL = `https://api.github.com/repos/${releaseRepository}/releases`;
export const EMDASH_DOCS_URL = 'https://docs.emdash.sh';
export const EMDASH_ISSUES_URL = 'https://github.com/generalaction/emdash/issues';
export const EMDASH_ISSUES_NEW_URL = 'https://github.com/generalaction/emdash/issues/new/choose';
