import { defineContract, fallible, procedure } from '@ply/wire/rpc';
import { z } from 'zod';
import {
  manualPlanActionSchema,
  manualPlanDocumentSchema,
  manualPlanErrorSchema,
} from './manual-plan';

export const plansDomain = 'plans' as const;

export const plansContract = defineContract({
  load: procedure({
    input: z.void(),
    output: manualPlanDocumentSchema,
  }),
  apply: fallible({
    input: manualPlanActionSchema,
    data: manualPlanDocumentSchema,
    error: manualPlanErrorSchema,
  }),
});

export type PlansContract = typeof plansContract;
