import { useState } from 'react';

export function usePickMode() {
  const [path, setPath] = useState('');
  const [initGitRepository, setinitGitRepository] = useState<boolean>(false);

  const handlePathChange = (newPath: string) => {
    setPath(newPath);
    setinitGitRepository(false);
  };

  const isValid = path.trim().length > 0;

  return {
    path,
    initGitRepository,
    setinitGitRepository,
    handlePathChange,
    isValid,
  };
}

export type PickModeState = ReturnType<typeof usePickMode>;
export type CloneModeState = ReturnType<typeof useCloneMode>;

export function useCloneMode(defaultPath: string) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [pathOverride, setPathOverride] = useState<string | undefined>(undefined);
  const path = pathOverride ?? defaultPath;

  const handleRepositoryUrlChange = (newRepositoryUrl: string) => {
    setRepositoryUrl(newRepositoryUrl);
  };

  const isValid = repositoryUrl.trim().length > 0 && path.trim().length > 0;

  return {
    repositoryUrl,
    path,
    setPath: setPathOverride,
    handleRepositoryUrlChange,
    isValid,
  };
}

export function extractRepoName(url: string): string {
  try {
    const parts = url.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] ?? '';
  } catch {
    return '';
  }
}
