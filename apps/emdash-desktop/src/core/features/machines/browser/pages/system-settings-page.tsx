import { PageLayout, SettingsCard } from '@emdash/ui/react/patterns';
import { useMemo } from 'react';
import { HostSettingsCard } from '../components/host-settings-card';
import { ResourceUtilizationRow } from '../components/machine-resources';
import { MachineSystemDependenciesCard } from '../components/machine-system-dependencies';
import { createSystemDependenciesStore } from '../machines-store';
import { useMachineMetrics } from '../use-machine-metrics';

export function SystemSettingsPage() {
  const metrics = useMachineMetrics();
  const systemDependenciesStore = useMemo(() => createSystemDependenciesStore(), []);

  return (
    <div className="space-y-8 pb-4">
      <PageLayout.Header
        sticky
        title="系统"
        description="查看本机资源用量和必需的系统依赖。"
      />
      <SettingsCard>
        <ResourceUtilizationRow metrics={metrics} />
      </SettingsCard>
      <HostSettingsCard />
      <MachineSystemDependenciesCard machinesStore={systemDependenciesStore} />
    </div>
  );
}
