import { z } from 'zod';
import { workbenchLayout } from '@core/primitives/layouts/api';
import { defineView } from '@core/primitives/views/api';

export const plansViewDef = defineView({
  id: 'plans',
  params: z.object({}),
  layout: workbenchLayout,
});
