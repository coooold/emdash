import {
  formatDirectPreviewServerHost,
  type DirectPreviewServer,
} from '@core/primitives/preview-servers/api';

export function formatPreviewUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.port ? `${u.hostname}:${u.port}` : u.hostname;
  } catch {
    return url;
  }
}

export function formatPreviewServerLabel(server: DirectPreviewServer): string {
  const host = formatDirectPreviewServerHost(server.host);
  return formatPreviewUrl(`${server.protocol}//${host}:${server.port}${server.urlPath}`);
}

export function previewServerStatusLabel(server: DirectPreviewServer): string {
  switch (server.status.kind) {
    case 'ready':
      return '已就绪';
    case 'starting':
      return '正在启动';
    case 'not-listening':
      return '端口尚未监听';
    case 'reconnecting':
      return '正在重新连接';
    case 'failed':
      return '失败';
  }
}

export function previewServerStatusClasses(server: DirectPreviewServer): string {
  switch (server.status.kind) {
    case 'ready':
      return 'bg-background-info text-foreground-info hover:bg-background-info-hover';
    case 'starting':
    case 'not-listening':
    case 'reconnecting':
      return 'bg-background-warning text-foreground-warning hover:bg-background-warning-hover';
    case 'failed':
      return 'bg-background-destructive text-foreground-destructive hover:bg-destructive/20';
  }
}
