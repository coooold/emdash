const repository = 'coooold/ply';
const repositoryUrl = `https://github.com/${repository}`;
const releaseRepository =
  (import.meta as ImportMeta & { env?: { VITE_RELEASE_REPOSITORY?: string } }).env
    ?.VITE_RELEASE_REPOSITORY ?? repository;

export const PLY_RELEASES_URL = `https://github.com/${releaseRepository}/releases`;
export const PLY_RELEASES_API_URL = `https://api.github.com/repos/${releaseRepository}/releases`;
export const PLY_DOCS_URL = `${repositoryUrl}#readme`;
export const PLY_PROJECT_CONFIG_DOCS_URL = `${repositoryUrl}#${encodeURIComponent('项目配置')}`;
export const PLY_ISSUES_URL = `${repositoryUrl}/issues`;
export const PLY_ISSUES_NEW_URL = `${PLY_ISSUES_URL}/new/choose`;
