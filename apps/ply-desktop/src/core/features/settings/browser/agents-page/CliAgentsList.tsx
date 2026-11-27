import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import { CollectionView, useQueryListSource } from '@ply/ui/react/patterns';
import { BotIcon } from 'lucide-react';
import React, { useLayoutEffect, useState } from 'react';
import { useAgents } from '@core/features/agents/api/browser/use-agents';
import { AgentDetailSheet } from '@core/features/settings/browser/agents-page/AgentDetailSheet';
import { AgentRow } from '@core/features/settings/browser/agents-page/AgentRow';
import { createAgentsListView } from '@core/features/settings/browser/agents-page/agents-list-model';
import type { AgentPayload } from '@core/primitives/agents/api';

type CliAgentsListProps = {
  searchQuery?: string;
  /** Sticky toolbar row rendered inside the list card. */
  toolbar?: React.ReactNode;
};

export const CliAgentsList: React.FC<CliAgentsListProps> = ({ searchQuery = '', toolbar }) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const agentsQuery = useAgents(LOCAL_HOST_REF);

  const source = useQueryListSource(agentsQuery, (agents: AgentPayload[]) => agents);
  const [view] = useState(() => createAgentsListView(source));

  // The search query is owned outside the view (settings search context or the
  // panel's local state); mirror it into the view's search slice.
  useLayoutEffect(() => {
    view.store.search?.setQuery(searchQuery);
  }, [searchQuery, view]);

  const hasAgents = (agentsQuery.data?.length ?? 0) > 0;

  return (
    <>
      <view.Root>
        <CollectionView
          view={view}
          renderRow={(agent) => <AgentRow agent={agent} />}
          layout="grouped"
          density="compact"
          toolbar={toolbar}
          onItemClick={(agent) => setSelectedAgentId(agent.id)}
          emptySlot={<AgentsEmptyState hasAgents={hasAgents} />}
        />
      </view.Root>
      <AgentDetailSheet agentId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />
    </>
  );
};

// Icon-bearing empty state — `EmptyState` has no icon slot, so this stays
// custom under the rich-states carve-out.
function AgentsEmptyState({ hasAgents }: { hasAgents: boolean }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
      <BotIcon className="mb-3 size-8 text-foreground-passive" />
      <div className="text-sm text-foreground">{hasAgents ? '没有匹配的智能体' : '暂无智能体'}</div>
      <p className="mt-1 max-w-sm text-xs text-foreground-passive">
        {hasAgents ? '请尝试其他名称。' : '检测到的本机智能体会显示在这里。'}
      </p>
    </div>
  );
}
