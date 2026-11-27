import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openFixture } from '@tooling/utils/db';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import type { AppDb } from '@core/services/app-db/node/db';
import * as schema from '@core/services/app-db/node/schema';
import type { ManualPlanAction } from '../api/manual-plan';
import { PlansService } from './plans-service';

describe('plans persistence', () => {
  let fixture: Awaited<ReturnType<typeof openFixture>> | undefined;
  let reopened: Database.Database | undefined;
  let persistedPath: string | undefined;

  afterEach(() => {
    reopened?.close();
    reopened = undefined;
    if (persistedPath) {
      for (const suffix of ['', '-wal', '-shm'])
        fs.rmSync(`${persistedPath}${suffix}`, { force: true });
      persistedPath = undefined;
    }
    fixture?.close();
    fixture = undefined;
  });

  it('keeps hierarchy, dates, ordering, and dependency edges after reopening the SQLite file', async () => {
    fixture = await openFixture('empty');
    let id = 0;
    const service = new PlansService(fixture.db as AppDb, {
      createId: () => `plan-${++id}`,
      getToday: () => '2026-11-27',
    });

    let document = await apply(service, { type: 'create-project', title: 'Project A' });
    document = await apply(service, { type: 'create-project', title: 'Project B' });
    document = await apply(service, {
      type: 'create-requirement',
      projectId: 'plan-1',
      title: 'Need A',
    });
    document = await apply(service, {
      type: 'create-task',
      projectId: 'plan-1',
      requirementId: 'plan-3',
      title: 'A1',
    });
    document = await apply(service, {
      type: 'create-task',
      projectId: 'plan-1',
      requirementId: 'plan-3',
      title: 'A2',
    });
    document = await apply(service, {
      type: 'create-requirement',
      projectId: 'plan-2',
      title: 'Need B',
    });
    document = await apply(service, {
      type: 'create-task',
      projectId: 'plan-2',
      requirementId: 'plan-6',
      title: 'B1',
    });
    document = await apply(service, {
      type: 'create-task',
      projectId: 'plan-2',
      requirementId: 'plan-6',
      title: 'B2',
    });
    document = await apply(service, {
      type: 'update-task',
      projectId: 'plan-1',
      taskId: 'plan-4',
      patch: { startDate: '2026-12-01', endDate: '2026-12-03' },
    });
    document = await apply(service, {
      type: 'move-task',
      projectId: 'plan-1',
      taskId: 'plan-5',
      direction: 'up',
    });
    document = await apply(service, {
      type: 'set-dependency',
      projectId: 'plan-1',
      taskId: 'plan-5',
      dependsOnTaskId: 'plan-4',
      enabled: true,
    });
    expect(document.projects).toHaveLength(2);

    const databaseFile = fixture.sqlite.pragma('database_list') as Array<{
      name: string;
      file: string;
    }>;
    const sourcePath = databaseFile.find(({ name }) => name === 'main')?.file;
    expect(sourcePath).toBeTruthy();
    fixture.sqlite.pragma('wal_checkpoint(TRUNCATE)');
    persistedPath = path.join(os.tmpdir(), `manual-plan-reopen-${crypto.randomUUID()}.db`);
    fs.copyFileSync(sourcePath!, persistedPath);
    fixture.close();
    fixture = undefined;

    reopened = new Database(persistedPath);
    const reopenedDb = drizzle(reopened, { schema }) as AppDb;
    const reopenedService = new PlansService(reopenedDb);
    const restored = await reopenedService.load();

    expect(restored).toEqual(document);
    expect(
      restored.projects[0]?.requirements[0]?.tasks.map(({ id, order }) => [id, order])
    ).toEqual([
      ['plan-5', 0],
      ['plan-4', 1],
    ]);
    expect(restored.projects[0]?.requirements[0]?.tasks[1]).toMatchObject({
      startDate: '2026-12-01',
      endDate: '2026-12-03',
    });
    expect(restored.projects[0]?.requirements[0]?.tasks[1]?.dependsOn).toEqual([]);
    expect(restored.projects[0]?.requirements[0]?.tasks[0]?.dependsOn).toEqual(['plan-4']);
  });

  it('rejects a cycle before writing any changed document', async () => {
    fixture = await openFixture('empty');
    let id = 0;
    const service = new PlansService(fixture.db as AppDb, {
      createId: () => `id-${++id}`,
      getToday: () => '2026-11-27',
    });
    await service.apply({ type: 'create-project', title: 'Project' });
    await service.apply({ type: 'create-requirement', projectId: 'id-1', title: 'Requirement' });
    await service.apply({
      type: 'create-task',
      projectId: 'id-1',
      requirementId: 'id-2',
      title: 'A',
    });
    await service.apply({
      type: 'create-task',
      projectId: 'id-1',
      requirementId: 'id-2',
      title: 'B',
    });
    expect(
      (
        await service.apply({
          type: 'set-dependency',
          projectId: 'id-1',
          taskId: 'id-4',
          dependsOnTaskId: 'id-3',
          enabled: true,
        })
      ).success
    ).toBe(true);
    const before = await service.load();

    const result = await service.apply({
      type: 'set-dependency',
      projectId: 'id-1',
      taskId: 'id-3',
      dependsOnTaskId: 'id-4',
      enabled: true,
    });
    expect(result).toMatchObject({ success: false, error: { code: 'dependency-cycle' } });
    expect(await service.load()).toEqual(before);
  });
});

async function apply(service: PlansService, action: ManualPlanAction) {
  const result = await service.apply(action);
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}
