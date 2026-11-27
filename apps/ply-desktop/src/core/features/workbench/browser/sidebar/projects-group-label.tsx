import { Button, DropdownMenu, MicroLabel, Tooltip } from '@ply/ui/react/primitives';
import { FolderPlus, ListFilter } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { getSidebarStore } from '@core/features/workbench/contributions/browser/app-stores';
import { useOpenModal } from '@core/manifests/browser/modal-api';
import { BoundShortcut } from '@core/primitives/keybindings/browser/shortcut';

export const ProjectsGroupLabel = observer(function ProjectsGroupLabel() {
  const openAddProjectModal = useOpenModal('addProjectModal');

  return (
    <div className="flex h-[40px] items-center justify-between pr-2.5 pl-5">
      <MicroLabel className="font-medium text-foreground-tertiary-passive">项目</MicroLabel>
      <div className="flex items-center gap-1">
        <DropdownMenu.Root>
          <Tooltip.Root>
            <DropdownMenu.Trigger
              render={
                <Tooltip.Trigger
                  render={
                    <Button type="button" variant="ghost" size="xs" icon aria-label="排列项目">
                      <ListFilter />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Content>排序方式</Tooltip.Content>
          </Tooltip.Root>
          <DropdownMenu.Content className="min-w-48">
            <DropdownMenu.Group>
              <DropdownMenu.Label>排序方式</DropdownMenu.Label>
              <DropdownMenu.RadioGroup value={getSidebarStore().taskSortBy}>
                <DropdownMenu.RadioItem
                  value="created-at"
                  onClick={() => getSidebarStore().applySort('created-at')}
                >
                  创建时间
                </DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem
                  value="updated-at"
                  onClick={() => getSidebarStore().applySort('updated-at')}
                >
                  最近使用
                </DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="xs"
                icon
                onClick={() => void openAddProjectModal({})}
                aria-label="添加项目"
              >
                <FolderPlus />
              </Button>
            }
          />
          <Tooltip.Content>
            添加项目
            <BoundShortcut command="app.newProject" variant="keycaps" />
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    </div>
  );
});
