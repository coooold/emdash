import { Tooltip } from '@emdash/ui/react/primitives';
import { MessageSquare, SquareTerminal } from 'lucide-react';
import type { ReactNode } from 'react';

export function AgentCapabilityIcons({ supportsChatUi }: { supportsChatUi: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {supportsChatUi && (
        <CapabilityIcon label="支持聊天界面">
          <MessageSquare className="size-3.5 text-foreground-passive" aria-hidden />
        </CapabilityIcon>
      )}
      <CapabilityIcon label="支持终端界面">
        <SquareTerminal className="size-3.5 text-foreground-passive" aria-hidden />
      </CapabilityIcon>
    </div>
  );
}

function CapabilityIcon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip.Provider delay={150}>
      <Tooltip.Root>
        <Tooltip.Trigger render={<span className="inline-flex" aria-label={label} />}>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
