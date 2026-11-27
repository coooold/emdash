import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlansClient } from '../api/browser/client';
import type { ManualPlanAction } from '../api/manual-plan';

const PLANS_QUERY_KEY = ['manual-plan'] as const;

export function usePlans() {
  return useQuery({
    queryKey: PLANS_QUERY_KEY,
    queryFn: async () => (await getPlansClient()).load(),
  });
}

export function useApplyPlanAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: ManualPlanAction) => {
      const result = await (await getPlansClient()).apply(action);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: (document) => queryClient.setQueryData(PLANS_QUERY_KEY, document),
  });
}
