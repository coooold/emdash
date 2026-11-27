import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import React from 'react';
import { McpPanel } from '@core/features/mcp/contributions/browser/McpPanel';

export const McpView: React.FC = () => (
  <McpPanel
    host={LOCAL_HOST_REF}
    header={{
      title: 'MCP',
      description: '为智能体连接外部数据源和工具。',
    }}
  />
);
