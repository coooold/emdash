import { Toggle, Tooltip } from '@ply/ui/react/primitives';
import { MessageSquare, SquareTerminal } from 'lucide-react';
import type { ConversationType } from '@core/primitives/conversations/api';

export function ConversationTransportToggle({
  value,
  onValueChange,
  disabled = false,
}: {
  value: ConversationType;
  onValueChange: (value: ConversationType) => void;
  disabled?: boolean;
}) {
  const useChatUi = value === 'acp';
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Toggle
            aria-label="使用聊天界面"
            pressed={useChatUi}
            onPressedChange={(pressed) => onValueChange(pressed ? 'acp' : 'pty')}
            disabled={disabled}
            size="link"
            icon
            style={{ width: '2rem', height: '2rem' }}
          />
        }
      >
        {useChatUi ? <MessageSquare aria-hidden /> : <SquareTerminal aria-hidden />}
      </Tooltip.Trigger>
      <Tooltip.Content>{useChatUi ? '聊天界面' : '终端界面'}</Tooltip.Content>
    </Tooltip.Root>
  );
}
