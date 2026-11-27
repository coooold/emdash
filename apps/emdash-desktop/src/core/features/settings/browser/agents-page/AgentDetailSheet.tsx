import { LOCAL_HOST_REF } from '@emdash/core/primitives/host/api';
import { MicroLabel, Sheet } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import { useAgentSettings } from '@core/features/agents/api/browser/use-agent-settings';
import { useAgents } from '@core/features/agents/api/browser/use-agents';
import {
  AgentHooksSection,
  AgentTrustSection,
} from '@core/features/settings/browser/agents-page/AgentIntegrationSection';
import {
  AgentMcpSection,
  useManageMcpSettingsNavigation,
} from '@core/features/settings/browser/agents-page/AgentMcpSection';
import { AgentSheetHeaderSection } from '@core/features/settings/browser/agents-page/AgentSheetHeaderSection';
import { InstalledAgentContent } from '@core/features/settings/browser/agents-page/InstalledAgentContent';
import { InstallSection } from '@core/features/settings/contributions/browser/agents-page/InstallSection';

interface AgentDetailSheetProps {
  agentId: string | null;
  onClose: () => void;
}

const AgentDetailSheetContent = observer(function AgentDetailSheetContent({
  agentId,
}: {
  agentId: string;
}) {
  const { data: agents } = useAgents(LOCAL_HOST_REF);
  const agentPayload = agents?.find((a) => a.id === agentId);

  const {
    value: storedConfig,
    isOverridden,
    isLoading,
    update,
    reset,
  } = useAgentSettings(agentId, LOCAL_HOST_REF);
  const navigateToMcpSettings = useManageMcpSettingsNavigation();

  const isInstalled = agentPayload?.status === 'available';

  return (
    <>
      <Sheet.Header>
        <MicroLabel>{isInstalled ? '智能体设置' : '安装智能体'}</MicroLabel>
      </Sheet.Header>
      <div className="overflow-y-auto px-4">
        {agentPayload && (
          <div className="space-y-6">
            <AgentSheetHeaderSection agent={agentPayload} />
            <InstallSection
              agentId={agentId}
              agentPayload={agentPayload}
              installOptions={agentPayload.installOptions}
              installDocs={agentPayload.installDocs}
              hideOverrideOptions={!isInstalled}
            />
            {isInstalled && <AgentHooksSection agent={agentPayload} host={LOCAL_HOST_REF} />}
            {isInstalled && <AgentTrustSection agent={agentPayload} />}
            {isInstalled && (
              <AgentMcpSection agentId={agentId} host={LOCAL_HOST_REF} onManage={navigateToMcpSettings} />
            )}
          </div>
        )}
      </div>
      {agentPayload && isInstalled && (
        <InstalledAgentContent
          storedConfig={storedConfig}
          isOverridden={isOverridden}
          isLoading={isLoading}
          update={update}
          reset={reset}
        />
      )}
    </>
  );
});

export function AgentDetailSheet({
  agentId,
  onClose,
}: AgentDetailSheetProps) {
  return (
    <Sheet.Root open={agentId !== null} onOpenChange={(open) => !open && onClose()}>
      <Sheet.Content side="right" className="flex flex-col gap-0 p-0">
        {agentId && (
          <AgentDetailSheetContent
            agentId={agentId}
          />
        )}
      </Sheet.Content>
    </Sheet.Root>
  );
}
