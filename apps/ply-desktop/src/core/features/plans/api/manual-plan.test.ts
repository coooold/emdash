import { describe, expect, it } from 'vitest';
import {
  applyManualPlanAction,
  emptyManualPlan,
  ManualPlanMutationError,
  validateManualPlanDocument,
  type ManualPlanDocument,
} from './manual-plan';

function createFixture() {
  let nextId = 0;
  const options = { createId: () => `id-${++nextId}`, today: '2026-11-27' };
  let document = emptyManualPlan();
  const apply = (action: Parameters<typeof applyManualPlanAction>[1]) => {
    document = applyManualPlanAction(document, action, options);
    return document;
  };
  return {
    apply,
    get document() {
      return document;
    },
  };
}

describe('manual plan model', () => {
  it('creates separate project, requirement, and task levels with stable sibling order', () => {
    const fixture = createFixture();
    fixture.apply({ type: 'create-project', title: 'Project A' });
    fixture.apply({ type: 'create-project', title: 'Project B' });
    fixture.apply({ type: 'create-requirement', projectId: 'id-1', title: 'Requirement A' });
    fixture.apply({
      type: 'create-task',
      projectId: 'id-1',
      requirementId: 'id-3',
      title: 'Build',
    });
    fixture.apply({ type: 'create-task', projectId: 'id-1', requirementId: 'id-3', title: 'Test' });

    expect(fixture.document.projects.map(({ title, order }) => [title, order])).toEqual([
      ['Project A', 0],
      ['Project B', 1],
    ]);
    expect(
      fixture.document.projects[0]?.requirements[0]?.tasks.map(({ title, order }) => [title, order])
    ).toEqual([
      ['Build', 0],
      ['Test', 1],
    ]);
    expect(fixture.document.projects[0]?.requirements[0]?.tasks[0]).toMatchObject({
      startDate: '2026-11-27',
      endDate: '2026-11-28',
    });
  });

  it('updates dates and order while rejecting an invalid date range without mutation', () => {
    const fixture = createFixture();
    fixture.apply({ type: 'create-project', title: 'Project A' });
    fixture.apply({ type: 'create-requirement', projectId: 'id-1', title: 'Requirement A' });
    fixture.apply({
      type: 'create-task',
      projectId: 'id-1',
      requirementId: 'id-2',
      title: 'First',
    });
    fixture.apply({
      type: 'create-task',
      projectId: 'id-1',
      requirementId: 'id-2',
      title: 'Second',
    });
    const before = structuredClone(fixture.document);

    expect(() =>
      fixture.apply({
        type: 'update-task',
        projectId: 'id-1',
        taskId: 'id-3',
        patch: { startDate: '2026-12-05' },
      })
    ).toThrow(ManualPlanMutationError);
    expect(fixture.document).toEqual(before);

    fixture.apply({
      type: 'update-task',
      projectId: 'id-1',
      taskId: 'id-3',
      patch: { startDate: '2026-12-05', endDate: '2026-12-06' },
    });
    fixture.apply({ type: 'move-task', projectId: 'id-1', taskId: 'id-4', direction: 'up' });
    expect(
      fixture.document.projects[0]?.requirements[0]?.tasks.map(({ id, order }) => [id, order])
    ).toEqual([
      ['id-4', 0],
      ['id-3', 1],
    ]);
  });

  it('allows valid dependencies and rejects self and transitive cycles', () => {
    const fixture = createFixture();
    fixture.apply({ type: 'create-project', title: 'Project A' });
    fixture.apply({ type: 'create-requirement', projectId: 'id-1', title: 'Requirement A' });
    for (const title of ['A', 'B', 'C']) {
      fixture.apply({ type: 'create-task', projectId: 'id-1', requirementId: 'id-2', title });
    }
    fixture.apply({
      type: 'set-dependency',
      projectId: 'id-1',
      taskId: 'id-4',
      dependsOnTaskId: 'id-3',
      enabled: true,
    });
    fixture.apply({
      type: 'set-dependency',
      projectId: 'id-1',
      taskId: 'id-5',
      dependsOnTaskId: 'id-4',
      enabled: true,
    });
    const beforeCycle = structuredClone(fixture.document);

    expect(() =>
      fixture.apply({
        type: 'set-dependency',
        projectId: 'id-1',
        taskId: 'id-3',
        dependsOnTaskId: 'id-5',
        enabled: true,
      })
    ).toThrow(expect.objectContaining({ code: 'dependency-cycle' }));
    expect(() =>
      fixture.apply({
        type: 'set-dependency',
        projectId: 'id-1',
        taskId: 'id-3',
        dependsOnTaskId: 'id-3',
        enabled: true,
      })
    ).toThrow(expect.objectContaining({ code: 'self-dependency' }));
    expect(fixture.document).toEqual(beforeCycle);

    expect(validateManualPlanDocument(fixture.document)).toEqual(beforeCycle);
  });

  it('rejects dependency edges that cross projects', () => {
    const fixture = createFixture();
    fixture.apply({ type: 'create-project', title: 'Project A' });
    fixture.apply({ type: 'create-project', title: 'Project B' });
    fixture.apply({ type: 'create-requirement', projectId: 'id-1', title: 'Requirement A' });
    fixture.apply({ type: 'create-requirement', projectId: 'id-2', title: 'Requirement B' });
    fixture.apply({ type: 'create-task', projectId: 'id-1', requirementId: 'id-3', title: 'A' });
    fixture.apply({ type: 'create-task', projectId: 'id-2', requirementId: 'id-4', title: 'B' });

    expect(() =>
      fixture.apply({
        type: 'set-dependency',
        projectId: 'id-1',
        taskId: 'id-5',
        dependsOnTaskId: 'id-6',
        enabled: true,
      })
    ).toThrow(ManualPlanMutationError);
  });

  it('validates a stored dependency graph before exposing it', () => {
    const invalid: ManualPlanDocument = {
      version: 1,
      projects: [
        {
          id: 'p',
          title: 'Project',
          order: 0,
          requirements: [
            {
              id: 'r',
              title: 'Requirement',
              order: 0,
              expanded: true,
              tasks: [
                {
                  id: 'a',
                  title: 'A',
                  order: 0,
                  startDate: '2026-11-27',
                  endDate: '2026-11-27',
                  dependsOn: ['b'],
                },
                {
                  id: 'b',
                  title: 'B',
                  order: 1,
                  startDate: '2026-11-27',
                  endDate: '2026-11-27',
                  dependsOn: ['a'],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => validateManualPlanDocument(invalid)).toThrow(
      expect.objectContaining({ code: 'dependency-cycle' })
    );
  });
});
