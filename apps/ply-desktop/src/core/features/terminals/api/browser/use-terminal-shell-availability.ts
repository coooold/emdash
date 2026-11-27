import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import type { TerminalShellAvailability } from '@ply/core/primitives/terminal-shell/api';
import { useQuery } from '@tanstack/react-query';
import { getTerminalsClient } from '@core/features/terminals/api/browser/client';

export const DEFAULT_TERMINAL_SHELL_AVAILABILITY: TerminalShellAvailability[] = [];

export function useTerminalShellAvailability(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['terminal-shell-availability', 'local'],
    queryFn: async () => {
      const result = await (
        await getTerminalsClient()
      ).getShellAvailability({
        host: LOCAL_HOST_REF,
      });
      if (!result.success) {
        throw new Error(
          'message' in result.error ? result.error.message : `无法查询 Shell：${result.error.type}`
        );
      }
      return result.data;
    },
    staleTime: 30_000,
    enabled: options.enabled ?? true,
  });
}
