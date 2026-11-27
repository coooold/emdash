import { createController, type Controller } from '@ply/wire/rpc';
import { plansContract } from '../api';
import type { PlansService } from './plans-service';

export function createPlansWireController(service: PlansService): Controller {
  return createController(plansContract, {
    load: () => service.load(),
    apply: (action) => service.apply(action),
  });
}
