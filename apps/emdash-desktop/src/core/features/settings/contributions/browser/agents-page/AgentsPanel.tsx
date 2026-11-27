import { LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { PageLayout } from '@emdash/ui/react/patterns';
import React, { useCallback, useState } from 'react';
import { useAgentInstallationStatuses } from '@core/features/agents/api/browser/use-agent-installation-statuses';
import { AgentsToolbar } from '@core/features/settings/browser/agents-page/AgentsToolbar';
import { CliAgentsList } from '@core/features/settings/browser/agents-page/CliAgentsList';

type AgentsPanelProps = {
  header?: { title: string; description: string };
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
};

export function AgentsPanel({
  header,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
}: AgentsPanelProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { probeAll } = useAgentInstallationStatuses(LOCAL_HOST_REF);
  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onSearchQueryChange ?? setLocalSearchQuery;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    probeAll(undefined, {
      onSettled: () => setRefreshing(false),
    });
  }, [probeAll]);

  const list = (
    <CliAgentsList
      searchQuery={searchQuery}
      toolbar={
        <AgentsToolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />
      }
    />
  );

  if (header) {
    return (
      <div className="flex min-h-0 flex-col gap-8">
        <PageLayout.Header sticky title={header.title} description={header.description} />
        {list}
      </div>
    );
  }

  return list;
}
