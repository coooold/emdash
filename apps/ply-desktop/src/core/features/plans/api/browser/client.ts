import type { ContractClient } from '@ply/wire/rpc';
import { domainClient } from '@core/primitives/wire/browser/connection';
import { plansContract, plansDomain } from '../contract';

export type PlansClient = ContractClient<typeof plansContract>;

export function getPlansClient(): Promise<PlansClient> {
  return domainClient<PlansClient>(plansDomain, plansContract);
}
