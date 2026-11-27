import type { LinkedIssue } from '@core/primitives/linked-issues/api';
import { buildContextActionText, type ContextAction } from '../context-bar/context-actions';

export async function resolveContextActionText(args: {
  action: ContextAction;
  linkedIssue?: LinkedIssue;
  projectId?: string;
}): Promise<string> {
  return buildContextActionText(args.action);
}
