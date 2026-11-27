import { LOCAL_HOST_REF } from '@ply/core/primitives/host/api';
import React from 'react';
import { SkillsPanel } from '@core/features/skills/contributions/browser/SkillsPanel';

export const SkillsView: React.FC = () => (
  <SkillsPanel
    host={LOCAL_HOST_REF}
    header={{
      title: '技能',
      description: '用可复用的技能扩展智能体。',
    }}
  />
);
