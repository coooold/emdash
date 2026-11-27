import { addProjectModal } from '../browser/components/add-project-modal/add-project-modal';
import { renameProjectModal } from '../browser/components/rename-project-modal';
import { projectConfigImportModal } from '../browser/components/settings-view/project-config-import-modal';
import { shareProjectConfigModal } from '../browser/components/settings-view/share-project-config-modal';
import { projectViewRuntime } from '../browser/view';
import { projectAvailabilityUiContribution } from './browser/project-availability-ui';

export const projectsBrowserContributions = {
  views: [projectViewRuntime],
  modalDefs: [
    addProjectModal,
    shareProjectConfigModal,
    projectConfigImportModal,
    renameProjectModal,
  ],
  projectAvailabilityUi: projectAvailabilityUiContribution,
} as const;
