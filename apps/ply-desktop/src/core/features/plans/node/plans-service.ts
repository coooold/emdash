import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from '@ply/shared';
import { KeyedMutex } from '@ply/shared/concurrency';
import type { AppDb } from '@core/services/app-db/node/db';
import { AppDbKeyValueStore } from '@core/services/app-db/node/key-value-store';
import type { ManualPlanAction, ManualPlanDocument, ManualPlanError } from '../api/manual-plan';
import {
  applyManualPlanAction,
  emptyManualPlan,
  ManualPlanMutationError,
  validateManualPlanDocument,
} from '../api/manual-plan';

type PlansKeyValue = { document: unknown };

export class PlansService {
  private readonly storage: AppDbKeyValueStore<PlansKeyValue>;
  private readonly writeMutex = new KeyedMutex();

  constructor(
    db: AppDb,
    private readonly options: { createId?: () => string; getToday?: () => string } = {}
  ) {
    this.storage = new AppDbKeyValueStore(db, 'manual-plans');
  }

  async load(): Promise<ManualPlanDocument> {
    const value = await this.storage.getOrThrow('document');
    return value === null ? emptyManualPlan() : validateManualPlanDocument(value);
  }

  apply(action: ManualPlanAction): Promise<Result<ManualPlanDocument, ManualPlanError>> {
    return this.writeMutex.runExclusive('document', async () => {
      try {
        const document = await this.load();
        const next = applyManualPlanAction(document, action, {
          createId: this.options.createId ?? randomUUID,
          today: this.options.getToday?.() ?? new Date().toISOString().slice(0, 10),
        });
        await this.storage.setOrThrow('document', next);
        return ok(next);
      } catch (error) {
        if (error instanceof ManualPlanMutationError) {
          return err({ code: error.code, message: error.message });
        }
        return err({ code: 'storage-error', message: '计划数据无法读取或保存' });
      }
    });
  }
}
