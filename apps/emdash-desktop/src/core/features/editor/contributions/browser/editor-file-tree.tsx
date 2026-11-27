import { encodeResourceUri } from '@emdash/core/primitives/path/api';
import { FILE_SEARCH_MAX_QUERY_LENGTH } from '@emdash/core/runtimes/file-search/api';
import { copyNameForConflict, MAX_FILE_UPLOAD_BYTES } from '@emdash/core/runtimes/files/api';
import type { GitChangeStatus } from '@emdash/core/runtimes/git/api';
import {
  EmptyState,
  FileTree,
  FileTreeToolbar,
  FileTreeToolbarSearch,
  canMoveNode,
  dedupeDescendantPaths,
  isExpandableFileTreeNode,
  isOpenableFileTreeNode,
  joinFileTreePath,
  normalizeFileTreePath,
  type ChildrenById,
  type FileTreeContextMenuItem,
  type FileTreeHandle,
  type FileTreeHeaderContext,
  type FileTreeNode,
  type FileTreeRootMenuItem,
  type FileTreeRowState,
} from '@emdash/ui/react/components';
import { toast } from '@emdash/ui/react/primitives';
import {
  ClipboardPaste,
  Circle,
  Copy,
  CopyMinus,
  FilePen,
  FilePlus,
  FileText,
  FolderOpen,
  FolderPlus,
  Link2,
  RefreshCw,
  Scissors,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { RenderableFileNode } from '@core/features/editor/api/browser/file-tree/tree-utils';
import type { FileTabResource } from '@core/features/editor/api/browser/task-editor/stores/file-tab-resource';
import {
  buildFileTreeGitDecorations,
  type FileTreeGitDecorations,
} from '@core/features/editor/browser/file-tree/file-tree-git-decorations';
import { FileContentSearchResults } from '@core/features/editor/browser/task-editor/file-content-search';
import type { TreeMutationError } from '@core/features/editor/browser/task-editor/stores/files-store';
import type { FilesStore } from '@core/features/editor/browser/task-editor/stores/files-store';
import { FileIcon } from '@core/features/editor/contributions/browser/file-icon';
import { fileTreeScope } from '@core/features/editor/contributions/scopes';
import { getFilesClient } from '@core/features/files/api/browser/client';
import { useAppSettingsKey } from '@core/features/settings/api/browser/use-app-settings-key';
import { gitCheckoutStoreToken } from '@core/features/source-control/contributions/browser/workspace-store-tokens';
import { openFile as openWorkbenchFile } from '@core/features/workbench/api/browser/open-file';
import {
  useTaskComposition,
  useWorkspace,
  useWorkspaceId,
} from '@core/features/workbench/api/browser/task-composition-context';
import { useTabLayout } from '@core/features/workbench/api/browser/task-tab-registry';
import { relativeToWorkspace } from '@core/features/workspaces/api/browser/workspace-path';
import { openModal, useOpenModal } from '@core/manifests/browser/modal-api';
import { projectAvailabilityUi } from '@core/manifests/browser/project-availability-ui';
import {
  copyTextToClipboard,
  getHostClient,
} from '@core/primitives/desktop-host/browser/host-client';
import {
  hostFileRefFromNativePath,
  nativePathFromHost,
} from '@core/primitives/desktop-runtime/api';
import {
  clearDraggedWorkspaceFile,
  setDraggedWorkspaceFile,
} from '@core/primitives/drag-files/browser/drag-files';
import { detectPlatformContext } from '@core/primitives/keybindings/api';
import { disabled, enabled, hidden, type ViewScopeImpl } from '@core/primitives/view-scopes/api';
import { useViewScope } from '@core/primitives/view-scopes/react';

const MAX_COPY_FILE_BYTES = 10 * 1024 * 1024;
const PLATFORM = detectPlatformContext().os;
const REVEAL_LABEL =
  PLATFORM === 'mac'
    ? '在访达中显示'
    : PLATFORM === 'windows'
      ? '在文件资源管理器中显示'
      : '在文件管理器中显示';

type ResultLikeError =
  | TreeMutationError
  | { message?: string; type?: string; paths?: readonly string[] };
type FileTreeClipboard = { mode: 'cut' | 'copy'; paths: string[] };

function resultErrorMessage(error: ResultLikeError | string | undefined): string {
  if (typeof error === 'string') return error;
  if (!error) return '未知错误';
  if ('message' in error && error.message) return error.message;
  if ('path' in error && error.path) return `${error.type}: ${error.path}`;
  return error.type ?? '未知错误';
}

function conflictPaths(error: ResultLikeError): string[] {
  if (error.type !== 'conflict' || !Array.isArray(error.paths)) return [];
  return [...error.paths];
}

async function importLocalFiles(args: {
  files: FilesStore;
  workspacePath: string;
  sshConnectionId?: string;
  sourceFiles: File[];
  destDirPath: string;
  overwrite?: boolean;
}): Promise<void> {
  const {
    files,
    workspacePath,
    sshConnectionId,
    sourceFiles,
    destDirPath,
    overwrite = false,
  } = args;
  const oversizedFile = sourceFiles.find((file) => file.size > MAX_FILE_UPLOAD_BYTES);
  if (oversizedFile) {
    toast.error('导入失败', {
      description: `${oversizedFile.name} exceeds the 10 MB upload limit.`,
    });
    return;
  }
  const destinations = sourceFiles.map((file) => joinFileTreePath(destDirPath, file.name));
  if (new Set(destinations).size !== destinations.length) {
    toast.error('导入失败', {
      description: '多个拖入的文件具有相同的目标名称。',
    });
    return;
  }

  const inserted = files.addOptimisticNodes(
    destinations.map((path) => ({
      path,
      type: 'file',
    }))
  );

  const handleFailure = async (error: ResultLikeError) => {
    for (const p of inserted) files.removeNode(p);
    const message = resultErrorMessage(error);
    const existingPaths = conflictPaths(error);
    if (existingPaths.length > 0 && !overwrite) {
      const description =
        existingPaths.length === 1
          ? `${existingPaths[0]} 已存在。要用拖入的文件替换它吗？`
          : `${existingPaths.length} 个文件已存在：${existingPaths.join('、')}。要用拖入的文件替换它们吗？`;
      const outcome = await openModal('confirmActionModal', {
        title: '替换现有文件？',
        description,
        confirmLabel: '替换',
        variant: 'destructive',
      });
      if (outcome.success) {
        void importLocalFiles({
          files,
          workspacePath,
          sshConnectionId,
          sourceFiles,
          destDirPath,
          overwrite: true,
        });
      }
      return;
    }

    toast.error('导入失败', { description: message });
  };

  try {
    const client = await getFilesClient();
    const destinationUri = (destination: string) =>
      encodeResourceUri(hostFileRefFromNativePath(destination, sshConnectionId));
    if (!overwrite) {
      const conflicts: string[] = [];
      for (const destination of destinations) {
        const result = await client.fs.exists({ uri: destinationUri(destination) });
        if (!result.success) {
          await handleFailure(result.error);
          return;
        }
        if (result.data.exists) conflicts.push(relativeToWorkspace(workspacePath, destination));
      }
      if (conflicts.length > 0) {
        await handleFailure({
          type: 'conflict',
          message: '文件已存在',
          paths: conflicts,
        });
        return;
      }
    }

    for (const [index, sourceFile] of sourceFiles.entries()) {
      const result = await client.fs.upload(
        { uri: destinationUri(destinations[index]), overwrite },
        {
          name: sourceFile.name,
          mimeType: sourceFile.type || 'application/octet-stream',
          size: sourceFile.size,
          lastModified: sourceFile.lastModified,
          source: sourceFile.stream(),
        }
      );
      if (!result.success) {
        await handleFailure(result.error);
        return;
      }
    }
  } catch (error) {
    await handleFailure({
      type: 'fs_error',
      message: error instanceof Error ? error.message : '无法导入文件。',
    });
  }
}

export const EditorFileTree = observer(function EditorFileTree() {
  const workspace = useWorkspace();
  const gitCheckout = workspace.get(gitCheckoutStoreToken);
  const workspaceId = useWorkspaceId();
  const taskView = useTaskComposition();
  const tabLayout = useTabLayout();
  const editorView = taskView.editorView;
  const files = editorView.files;
  const directoryErrors = files?.directoryErrors;
  const isSshWorkspace = Boolean(workspace.sshConnectionId);
  const liveActionDisabledReason = isSshWorkspace
    ? '此 SSH 工作区已停用。'
    : projectAvailabilityUi.getLiveActionDisabledReason(taskView.projectId);
  const liveActionsDisabled = Boolean(liveActionDisabledReason);
  const { value: filesSettings } = useAppSettingsKey('files');
  const openConfirmActionModal = useOpenModal('confirmActionModal');
  const [searchQuery, setSearchQuery] = useState('');
  const [renamePath, setRenamePath] = useState<string | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<ReadonlySet<string>>(new Set());
  const [selectionAnchorPath, setSelectionAnchorPath] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<FileTreeClipboard | null>(null);
  const [pendingDraft, setPendingDraft] = useState<'file' | 'directory' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const treeRef = useRef<FileTreeHandle>(null);
  const lastSyncedActivePathRef = useRef<string | null>(null);
  const focusRequest = editorView.fileSearchFocusRequest;
  const revealRequest = editorView.revealFileRequest;
  const expandedPaths = editorView.expandedPaths;
  const activeFile = tabLayout.focusedPane.activeResourceOfKind<FileTabResource>('file');
  const openedPaths = useMemo(() => new Set(editorView.openFilePaths), [editorView.openFilePaths]);
  const fileChanges = gitCheckout.fileChanges;
  const gitDecorations = useMemo(() => buildFileTreeGitDecorations(fileChanges), [fileChanges]);
  const { rootNodes, childrenById } = useMemo(
    () => mapFileTreeData(files?.rootNodes ?? [], files?.childrenById ?? new Map()),
    [files?.childrenById, files?.rootNodes]
  );
  const nodeByPath = useMemo(
    () => collectFileTreeNodes(rootNodes, childrenById),
    [childrenById, rootNodes]
  );
  const selectedNodes = useMemo(
    () => [...selectedPaths].flatMap((path) => nodeByPath.get(path) ?? []),
    [nodeByPath, selectedPaths]
  );
  const selectionTargetNode = selectionAnchorPath ? nodeByPath.get(selectionAnchorPath) : undefined;
  const creationTargetPath = creationTargetForNode(selectionTargetNode, workspace.path);

  const setSearchInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      searchInputRef.current = input;
      if (!input || focusRequest === 0) return;
      input.focus();
      input.select();
    },
    [focusRequest]
  );

  React.useEffect(() => {
    if (focusRequest === 0) return;
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [focusRequest]);

  React.useEffect(() => {
    files?.setExclusions(filesSettings?.treeExclude);
  }, [files, filesSettings?.treeExclude]);

  React.useEffect(() => {
    const activePath = activeFile?.path ?? null;
    if (!activePath) {
      lastSyncedActivePathRef.current = null;
      return;
    }
    if (lastSyncedActivePathRef.current === activePath) return;
    // Paths outside the workspace tree simply have no node to select.
    if (!nodeByPath.has(activePath)) return;
    lastSyncedActivePathRef.current = activePath;
    setSelectedPaths(new Set([activePath]));
    setSelectionAnchorPath(activePath);
  }, [activeFile?.path, nodeByPath]);

  React.useEffect(() => {
    setSelectedPaths((current) => prunePathSet(current, nodeByPath));
    setClipboard((current) =>
      current
        ? current.paths.filter((path) => nodeByPath.has(path)).length > 0
          ? { ...current, paths: current.paths.filter((path) => nodeByPath.has(path)) }
          : null
        : null
    );
    setSelectionAnchorPath((current) => (current && nodeByPath.has(current) ? current : null));
  }, [nodeByPath]);

  React.useEffect(() => {
    if (!pendingDraft || searchQuery) return;
    treeRef.current?.startDraft(pendingDraft);
    setPendingDraft(null);
  }, [pendingDraft, searchQuery]);

  React.useEffect(() => {
    if (!revealRequest) return;
    if (revealRequest.status === 'error') {
      editorView.consumeRevealFileRequest(revealRequest.id);
      toast.error('定位文件失败', { description: resultErrorMessage(revealRequest.error) });
      return;
    }
    setSelectedPaths(new Set([revealRequest.path]));
    setSelectionAnchorPath(revealRequest.path);
    const frame = window.requestAnimationFrame(() => {
      treeRef.current?.scrollToPath(revealRequest.path);
      editorView.consumeRevealFileRequest(revealRequest.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorView, revealRequest]);

  // Route through the openFile seam (spec §10): sidebar clicks resolve the
  // file's identity here at the edge and never reveal (the tree already shows
  // the file and keeps focus).
  const openFile = (path: string, preview: boolean) => {
    openWorkbenchFile(hostFileRefFromNativePath(path, workspace.sshConnectionId), {
      context: { projectId: taskView.projectId, taskId: taskView.taskId },
      preview,
    });
  };

  const startDraft = (kind: 'file' | 'directory') => {
    if (searchQuery) {
      setPendingDraft(kind);
      setSearchQuery('');
      return;
    }
    treeRef.current?.startDraft(kind);
  };

  const collapseAll = () => editorView.collapsePaths([...expandedPaths]);
  const retryFolder = useCallback(
    (path: string) => {
      if (!files) return;
      void files.retry(path).then((result) => {
        if (!result.success) {
          toast.error('加载文件夹失败', { description: resultErrorMessage(result.error) });
        }
      });
    },
    [files]
  );
  const expandAll = () => {
    const directoryPaths = [...nodeByPath.values()]
      .filter(isExpandableFileTreeNode)
      .map((node) => node.path);
    editorView.expandPaths(directoryPaths);
  };

  const refresh = async () => {
    if (!files || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await files.refresh();
      if (!result.success) {
        toast.error('刷新失败', { description: resultErrorMessage(result.error) });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateFile = async (parentPath: string, name: string) => {
    if (!files) return;
    const path = joinFileTreePath(parentPath, name);
    const result = await files.createFile(path);
    if (!result.success) {
      toast.error('创建失败', { description: resultErrorMessage(result.error) });
      return;
    }
    editorView.expandPath(parentPath);
    openFile(path, false);
    toast('File created');
  };

  const handleCreateDirectory = async (parentPath: string, name: string) => {
    if (!files) return;
    const path = joinFileTreePath(parentPath, name);
    const result = await files.createDirectory(path);
    if (!result.success) {
      toast.error('创建失败', { description: resultErrorMessage(result.error) });
      return;
    }
    editorView.expandPath(parentPath);
    editorView.expandPath(path);
    toast('Folder created');
  };

  const handleRename = async (node: FileTreeNode, name: string) => {
    if (!files) return;
    const targetPath = joinFileTreePath(node.parentPath ?? '', name);
    const result = await files.rename(node.path, name);
    if (!result.success) {
      toast.error('重命名失败', { description: resultErrorMessage(result.error) });
      return;
    }
    await editorView.retargetOpenFiles(node.path, targetPath);
    setRenamePath(null);
    toast(node.type === 'directory' ? '已重命名文件夹' : '已重命名文件');
  };

  const handleMove = async (sourcePaths: string[], targetDirPath: string) => {
    if (!files) return;
    const deduped = dedupeDescendantPaths(sourcePaths);
    let moved = 0;
    for (const sourcePath of deduped) {
      const targetPath = joinFileTreePath(targetDirPath, basenameFromPath(sourcePath));
      const result = await files.move(sourcePath, targetDirPath);
      if (!result.success) {
        toast.error('移动失败', { description: resultErrorMessage(result.error) });
        return;
      }
      await editorView.retargetOpenFiles(sourcePath, targetPath);
      moved += 1;
    }
    toast(moved === 1 ? '已移动项目' : `已移动 ${moved} 项`);
  };

  const closeDeletedFileTabs = (nodes: readonly FileTreeNode[]) => {
    for (const { pane } of taskView.paneLayout.groups) {
      for (const tab of pane.resolvedTabs) {
        if (tab.kind !== 'file') continue;
        const resource = tab.resource as FileTabResource;
        if (
          nodes.some((node) =>
            isPathWithin(
              resource.path,
              node.path,
              node.type === 'directory' || isExpandableFileTreeNode(node)
            )
          )
        ) {
          void pane.closeTab(tab.tabId);
        }
      }
    }
  };

  const confirmDelete = (nodes: readonly FileTreeNode[]) => {
    void (async () => {
      if (!files) return;
      const paths = dedupeDescendantPaths(nodes.map((node) => node.path));
      const targets = paths.flatMap((path) => nodeByPath.get(path) ?? []);
      if (targets.length === 0) return;
      const single = targets.length === 1 ? targets[0] : null;
      const outcome = await openConfirmActionModal({
        title: single
          ? single.type === 'directory'
            ? '删除文件夹？'
            : single.type === 'symlink'
              ? '删除链接？'
              : '删除文件？'
          : `删除这 ${targets.length} 项？`,
        description:
          single?.type === 'directory'
            ? `将从工作区删除「${single.path}」及其全部内容。`
            : single?.type === 'symlink'
              ? `将从工作区移除链接「${single.path}」，保留它指向的项目。`
              : single
                ? `将从工作区删除「${single.path}」。`
                : `将从工作区删除：${targets.map((node) => `「${node.path}」`).join('、')}。`,
        confirmLabel: '删除',
        variant: 'destructive',
      });
      if (!outcome.success) return;
      for (const node of targets) {
        const result = await files.deleteEntry(node.path, node.type === 'directory');
        if (!result.success) {
          toast.error('删除失败', { description: resultErrorMessage(result.error) });
          return;
        }
      }
      closeDeletedFileTabs(targets);
      setSelectedPaths(new Set());
      setSelectionAnchorPath(null);
      toast(
        single
          ? single.type === 'directory'
            ? '已删除文件夹'
            : single.type === 'symlink'
              ? '已删除链接'
              : '已删除文件'
          : `已删除 ${targets.length} 项`
      );
    })();
  };

  const copyFile = async (node: FileTreeNode) => {
    if (!isOpenableFileTreeNode(node)) return;
    try {
      const client = await getFilesClient();
      const result = await client.fs.readText({
        uri: encodeResourceUri(hostFileRefFromNativePath(node.path, workspace.sshConnectionId)),
        options: { maxBytes: MAX_COPY_FILE_BYTES },
      });
      if (!result.success) {
        toast.error('复制失败', { description: resultErrorMessage(result.error) });
        return;
      }
      if (result.data.truncated) {
        toast.error('复制失败', { description: '文件过大，无法复制。' });
        return;
      }
      await copyTextToClipboard(result.data.content);
      toast('File copied');
    } catch (error) {
      toast.error('复制失败', {
        description: error instanceof Error ? error.message : '无法复制文件。',
      });
    }
  };

  const copyPath = async (node: FileTreeNode) => {
    try {
      const client = await getFilesClient();
      const result = await client.fs.realPath({
        uri: encodeResourceUri(hostFileRefFromNativePath(node.path, workspace.sshConnectionId)),
      });
      if (!result.success) {
        toast.error('复制失败', { description: resultErrorMessage(result.error) });
        return;
      }
      await copyTextToClipboard(nativePathFromHost(result.data.path));
      toast('Path copied');
    } catch (error) {
      toast.error('复制失败', {
        description: error instanceof Error ? error.message : '无法复制路径。',
      });
    }
  };

  const copyRelativePath = async (node: FileTreeNode) => {
    try {
      await copyTextToClipboard(relativeToWorkspace(workspace.path, node.path));
      toast('Relative path copied');
    } catch (error) {
      toast.error('复制失败', {
        description: error instanceof Error ? error.message : '无法复制路径。',
      });
    }
  };

  const revealInFileManager = async (node: FileTreeNode) => {
    try {
      const result = await (
        await getHostClient()
      ).showWorkspaceItemInFolder({
        workspaceId,
        relativePath: relativeToWorkspace(workspace.path, node.path),
      });
      if (!result.success) {
        toast.error('打开位置失败', { description: resultErrorMessage(result.error) });
      }
    } catch (error) {
      toast.error('打开位置失败', {
        description: error instanceof Error ? error.message : '无法显示项目位置。',
      });
    }
  };

  const selectionOrNode = (node?: FileTreeNode): FileTreeNode[] => {
    if (node && !selectedPaths.has(node.path)) return [node];
    if (selectedNodes.length > 0) return selectedNodes;
    return node ? [node] : [];
  };

  const cutSelection = (node?: FileTreeNode) => {
    const paths = dedupeDescendantPaths(selectionOrNode(node).map((entry) => entry.path));
    if (paths.length === 0) return;
    setClipboard({ mode: 'cut', paths });
    toast(paths.length === 1 ? '已剪切项目' : `已剪切 ${paths.length} 项`);
  };

  const copySelection = (node?: FileTreeNode) => {
    const paths = dedupeDescendantPaths(selectionOrNode(node).map((entry) => entry.path));
    if (paths.length === 0) return;
    setClipboard({ mode: 'copy', paths });
    toast(paths.length === 1 ? '已复制项目' : `已复制 ${paths.length} 项`);
  };

  const pasteClipboard = async (targetDirPath = pasteTargetPath()) => {
    if (!files || !clipboard || clipboard.paths.length === 0) return;
    const existingNames = existingChildNames(
      targetDirPath,
      nodeByPath,
      childrenById,
      workspace.path
    );
    let completed = 0;
    for (const sourcePath of clipboard.paths) {
      const source = nodeByPath.get(sourcePath);
      if (!source) continue;
      const sourceParentPath = source.parentPath ?? workspace.path;
      const sameDirectory =
        normalizeFileTreePath(sourceParentPath) === normalizeFileTreePath(targetDirPath);
      if (clipboard.mode === 'cut' && sameDirectory) continue;
      const hasConflict = nodeByPath.has(
        normalizeFileTreePath(joinFileTreePath(targetDirPath, source.name))
      );
      const nextName =
        clipboard.mode === 'copy' || hasConflict
          ? copyNameForConflict(source.name, existingNames)
          : source.name;
      existingNames.add(nextName);
      const targetPath = joinFileTreePath(targetDirPath, nextName);
      if (clipboard.mode === 'cut' && targetPath === sourcePath) continue;
      const result =
        clipboard.mode === 'cut'
          ? await files.move(sourcePath, targetDirPath, nextName)
          : await files.copy(sourcePath, targetDirPath, nextName);
      if (!result.success) {
        toast.error(clipboard.mode === 'cut' ? '移动失败' : '复制失败', {
          description: resultErrorMessage(result.error),
        });
        return;
      }
      if (clipboard.mode === 'cut') {
        await editorView.retargetOpenFiles(sourcePath, targetPath);
      }
      completed += 1;
    }
    if (clipboard.mode === 'cut') setClipboard(null);
    toast(
      clipboard.mode === 'cut'
        ? completed === 1
          ? '已移动项目'
          : `已移动 ${completed} 项`
        : completed === 1
          ? '已复制项目'
          : `已复制 ${completed} 项`
    );
  };

  const pasteTargetPath = () => creationTargetPath;

  const renameSelection = () => {
    const target = selectedNodes.length === 1 ? selectedNodes[0] : null;
    if (!target) return;
    setRenamePath(target.path);
  };

  const getContextMenuItems = (
    node: FileTreeNode,
    selection: readonly FileTreeNode[]
  ): FileTreeContextMenuItem[] => {
    const items: FileTreeContextMenuItem[] = [];
    items.push(
      {
        id: 'cut',
        label: '剪切',
        icon: <Scissors size={14} />,
        onSelect: () => cutSelection(node),
      },
      {
        id: 'copy',
        label: '复制',
        icon: <Copy size={14} />,
        onSelect: () => copySelection(node),
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: <ClipboardPaste size={14} />,
        disabled: !clipboard || clipboard.paths.length === 0,
        onSelect: () => void pasteClipboard(creationTargetForNode(node, workspace.path)),
      }
    );
    if (isOpenableFileTreeNode(node)) {
      items.push({
        id: 'copy-file',
        label: '复制内容',
        icon: <FileText size={14} />,
        onSelect: () => void copyFile(node),
      });
    }
    items.push(
      {
        id: 'copy-path',
        label: '复制路径',
        icon: <Copy size={14} />,
        onSelect: () => void copyPath(node),
      },
      {
        id: 'copy-relative-path',
        label: '复制相对路径',
        icon: <Copy size={14} />,
        onSelect: () => void copyRelativePath(node),
      }
    );
    if (!workspace.sshConnectionId) {
      items.push({
        id: 'reveal',
        label: REVEAL_LABEL,
        icon: <FolderOpen size={14} />,
        onSelect: () => void revealInFileManager(node),
      });
    }
    items.push(
      {
        id: 'rename',
        label: '重命名',
        icon: <FilePen size={14} />,
        disabled: liveActionsDisabled || selection.length !== 1,
        onSelect: () => setRenamePath(selection[0]?.path ?? node.path),
      },
      {
        id: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        variant: 'destructive',
        disabled: liveActionsDisabled,
        onSelect: () => confirmDelete(selection),
      }
    );
    return items;
  };

  const fileTreeScopeImplementation = {
    'editor.fileTree.rename': () => ({
      availability: () =>
        liveActionDisabledReason
          ? disabled(liveActionDisabledReason)
          : selectedNodes.length === 1
            ? enabled
            : disabled('Select one item'),
      execute: renameSelection,
    }),
    'editor.fileTree.cut': () => ({
      availability: () => (selectedNodes.length > 0 ? enabled : disabled('未选择项目')),
      execute: () => cutSelection(),
    }),
    'editor.fileTree.copy': () => ({
      availability: () => (selectedNodes.length > 0 ? enabled : disabled('未选择项目')),
      execute: () => copySelection(),
    }),
    'editor.fileTree.paste': () => ({
      availability: () =>
        liveActionDisabledReason
          ? disabled(liveActionDisabledReason)
          : clipboard
            ? enabled
            : disabled('没有可粘贴的内容'),
      execute: () => void pasteClipboard(),
    }),
    'editor.fileTree.delete': () => ({
      availability: () =>
        liveActionDisabledReason
          ? disabled(liveActionDisabledReason)
          : selectedNodes.length > 0
            ? enabled
            : hidden,
      execute: () => confirmDelete(selectedNodes),
    }),
  } satisfies ViewScopeImpl<typeof fileTreeScope>;
  const { attachRef: attachFileTreeScope } = useViewScope(
    fileTreeScope({ workspaceId }),
    fileTreeScopeImplementation
  );

  const headerContext: FileTreeHeaderContext = {
    targetPath: creationTargetPath,
    startDraft,
    collapseAll,
    expandAll,
  };

  const content =
    isSshWorkspace || files?.observation.kind === 'unavailable' ? (
      <EmptyState
        label="文件不可用"
        description={liveActionDisabledReason ?? '尚未读取文件树。'}
      />
    ) : searchQuery && !liveActionsDisabled ? (
      <FileContentSearchResults workspaceId={workspaceId} query={searchQuery} />
    ) : (
      <FileTree
        ref={treeRef}
        rootPath={workspace.path}
        rootNodes={rootNodes}
        childrenById={childrenById}
        expandedPaths={expandedPaths}
        selectedPath={selectionAnchorPath ?? activeFile?.path ?? null}
        selectedPaths={selectedPaths}
        openedPaths={openedPaths}
        isLoading={files?.isLoading ?? true}
        error={files?.error}
        compactChains
        renamePath={renamePath}
        getRootContextMenuItems={() => {
          const items: FileTreeRootMenuItem[] = [
            {
              id: 'new-file',
              label: '新建文件',
              icon: <FilePlus size={14} />,
              disabled: liveActionsDisabled,
              onSelect: () =>
                treeRef.current?.startDraft('file', normalizeFileTreePath(workspace.path)),
            },
            {
              id: 'new-folder',
              label: '新建文件夹',
              icon: <FolderPlus size={14} />,
              disabled: liveActionsDisabled,
              onSelect: () =>
                treeRef.current?.startDraft('directory', normalizeFileTreePath(workspace.path)),
            },
          ];
          if (clipboard && clipboard.paths.length > 0) {
            items.push({
              id: 'paste',
              label: '粘贴',
              icon: <ClipboardPaste size={14} />,
              disabled: liveActionsDisabled,
              onSelect: () => void pasteClipboard(normalizeFileTreePath(workspace.path)),
            });
          }
          return items;
        }}
        renderHeader={() => null}
        onCollapseAll={collapseAll}
        onExpandAll={(paths) => editorView.expandPaths([...paths])}
        // Opening a folder subscribes to its listing; collapsing it releases it.
        onToggleExpand={(node, expanded) => {
          if (expanded) editorView.expandPath(node.path);
          else editorView.collapsePath(node.path);
        }}
        onRequestExpand={(path) => {
          editorView.expandPath(path);
          if (files?.directoryErrors.has(path)) retryFolder(path);
        }}
        onSelectionChange={(paths, anchorPath) => {
          setSelectedPaths(new Set(paths));
          setSelectionAnchorPath(anchorPath);
        }}
        onOpenFile={(node, options) => openFile(node.path, options.preview)}
        onCreateFile={handleCreateFile}
        onCreateDirectory={handleCreateDirectory}
        onRenameSubmit={handleRename}
        onRenameCancel={() => setRenamePath(null)}
        getContextMenuItems={getContextMenuItems}
        renderIcon={(node) => {
          if (node.type === 'file') return <FileIcon filename={node.name} size={12} />;
          if (node.type === 'symlink') return <Link2 size={12} />;
          return null;
        }}
        renderDecoration={(node) => {
          if (node.type !== 'directory') return null;
          const status = gitDecorations.directoryStatusByPath.get(
            relativeFileTreePath(workspace.path, node.path)
          );
          return status ? <FileTreeGitChangeIndicator status={status} /> : null;
        }}
        getRowState={(node) => ({
          ...mergeRowState(
            rowStateForNode(node, workspace.path, gitDecorations),
            clipboard?.mode === 'cut' && clipboard.paths.includes(node.path)
              ? { muted: true }
              : undefined
          ),
          loadError: directoryErrors?.get(node.path),
        })}
        dnd={
          files && !liveActionsDisabled
            ? {
                canDrop: (sources, targetDir) =>
                  sources.every((source) =>
                    canMoveNode(source.path, targetDir?.path ?? workspace.path, workspace.path)
                  ),
                onMove: handleMove,
                onDropExternal: (dataTransfer, targetDirPath) => {
                  const sourceFiles = Array.from(dataTransfer.files);
                  if (sourceFiles.length === 0) return;
                  void importLocalFiles({
                    files,
                    workspacePath: workspace.path,
                    sshConnectionId: workspace.sshConnectionId,
                    sourceFiles,
                    destDirPath: targetDirPath,
                  });
                },
                onDragStart: (_node, dataTransfer, selection) => {
                  setDraggedWorkspaceFile(dataTransfer, {
                    workspaceId,
                    targetPaths: selection.map((node) => node.path),
                    targetPlatform: workspace.sshConnectionId ? 'linux' : undefined,
                  });
                },
                onDragEnd: () => clearDraggedWorkspaceFile(),
              }
            : undefined
        }
      />
    );

  return (
    <div
      ref={attachFileTreeScope}
      className="surface-paper flex h-full flex-col overflow-hidden bg-(--em-surface)"
    >
      <FileTreeHeaderBar
        context={headerContext}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setSearchInputRef={setSearchInputRef}
        onRefresh={() => void refresh()}
        isRefreshing={isRefreshing}
        liveActionDisabledReason={liveActionDisabledReason}
      />
      {files?.observation.kind === 'stale' && liveActionDisabledReason && (
        <div
          className="border-b bg-background-secondary px-2 py-1 text-xs text-foreground-muted"
          tabIndex={0}
          role="note"
        >
          {liveActionDisabledReason}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{content}</div>
    </div>
  );
});

export function FileTreeHeaderBar({
  context,
  searchQuery,
  setSearchQuery,
  setSearchInputRef,
  onRefresh,
  isRefreshing,
  liveActionDisabledReason,
}: {
  context: FileTreeHeaderContext;
  searchQuery: string;
  setSearchQuery(value: string): void;
  setSearchInputRef(input: HTMLInputElement | null): void;
  onRefresh(): void;
  isRefreshing: boolean;
  liveActionDisabledReason?: string | null;
}) {
  return (
    <FileTreeToolbar
      search={
        <FileTreeToolbarSearch
          disabled={Boolean(liveActionDisabledReason)}
          ref={setSearchInputRef}
          value={searchQuery}
          maxLength={FILE_SEARCH_MAX_QUERY_LENGTH}
          aria-label="搜索文件"
          placeholder="搜索文件"
          onClear={() => setSearchQuery('')}
          onChange={(event) => setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            if (searchQuery) setSearchQuery('');
            else event.currentTarget.blur();
          }}
        />
      }
      actions={
        <>
          <HeaderAction
            label={liveActionDisabledReason ?? '新建文件'}
            disabled={Boolean(liveActionDisabledReason)}
            onClick={() => context.startDraft('file')}
          >
            <FilePlus className="size-3.5" />
          </HeaderAction>
          <HeaderAction
            label={liveActionDisabledReason ?? '新建文件夹'}
            disabled={Boolean(liveActionDisabledReason)}
            onClick={() => context.startDraft('directory')}
          >
            <FolderPlus className="size-3.5" />
          </HeaderAction>
          <HeaderAction label="全部折叠" onClick={context.collapseAll}>
            <CopyMinus className="size-3.5" />
          </HeaderAction>
          <HeaderAction
            label={liveActionDisabledReason ?? '刷新'}
            onClick={onRefresh}
            disabled={isRefreshing || Boolean(liveActionDisabledReason)}
          >
            <RefreshCw className={isRefreshing ? 'size-3.5 animate-spin' : 'size-3.5'} />
          </HeaderAction>
        </>
      }
    />
  );
}

function HeaderAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick(): void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-background-1 hover:text-foreground"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// The store reuses nodes and child lists for unchanged entries; mapping them through
// these caches keeps that identity, so the tree only re-sorts folders that changed.
const fileTreeNodeCache = new WeakMap<RenderableFileNode, FileTreeNode>();
const fileTreeListCache = new WeakMap<readonly RenderableFileNode[], readonly FileTreeNode[]>();

function mapFileTreeData(
  roots: readonly RenderableFileNode[],
  children: Map<string | null, RenderableFileNode[]>
): { rootNodes: readonly FileTreeNode[]; childrenById: ChildrenById } {
  const mappedChildren = new Map<string | null, readonly FileTreeNode[]>();
  for (const [parentId, entries] of children) {
    mappedChildren.set(parentId, toFileTreeNodes(entries));
  }
  return {
    rootNodes: toFileTreeNodes(roots),
    childrenById: mappedChildren,
  };
}

function toFileTreeNodes(nodes: readonly RenderableFileNode[]): readonly FileTreeNode[] {
  let mapped = fileTreeListCache.get(nodes);
  if (!mapped) {
    mapped = nodes.map((node) => {
      let treeNode = fileTreeNodeCache.get(node);
      if (!treeNode) {
        treeNode = toFileTreeNode(node);
        fileTreeNodeCache.set(node, treeNode);
      }
      return treeNode;
    });
    fileTreeListCache.set(nodes, mapped);
  }
  return mapped;
}

function collectFileTreeNodes(
  roots: readonly FileTreeNode[],
  childrenById: ChildrenById
): Map<string, FileTreeNode> {
  const nodes = new Map<string, FileTreeNode>();
  const visit = (node: FileTreeNode) => {
    nodes.set(normalizeFileTreePath(node.path), node);
    for (const child of childrenById.get(node.id) ?? []) visit(child);
  };
  for (const root of roots) visit(root);
  return nodes;
}

function creationTargetForNode(node: FileTreeNode | undefined, rootPath: string): string {
  if (!node) return normalizeFileTreePath(rootPath);
  if (isExpandableFileTreeNode(node)) return normalizeFileTreePath(node.path);
  return normalizeFileTreePath(node.parentPath ?? rootPath);
}

function prunePathSet(
  paths: ReadonlySet<string>,
  nodeByPath: ReadonlyMap<string, FileTreeNode>
): ReadonlySet<string> {
  const next = new Set([...paths].filter((path) => nodeByPath.has(path)));
  return next.size === paths.size ? paths : next;
}

function mergeRowState(
  base: FileTreeRowState | undefined,
  override: FileTreeRowState | undefined
): FileTreeRowState | undefined {
  if (!base) return override;
  if (!override) return base;
  return { ...base, ...override };
}

function existingChildNames(
  targetDirPath: string,
  nodeByPath: ReadonlyMap<string, FileTreeNode>,
  childrenById: ChildrenById,
  rootPath: string
): Set<string> {
  const normalizedTarget = normalizeFileTreePath(targetDirPath);
  const root = normalizeFileTreePath(rootPath);
  const parentNode = normalizedTarget === root ? null : nodeByPath.get(normalizedTarget);
  if (parentNode === undefined) return new Set();
  const parent = parentNode === null ? null : parentNode.id;
  return new Set((childrenById.get(parent) ?? []).map((node) => node.name));
}

function toFileTreeNode(node: RenderableFileNode): FileTreeNode {
  return {
    id: node.id,
    path: node.path,
    name: node.name,
    parentId: node.parentId,
    parentPath: node.parentPath,
    depth: node.depth,
    type: node.type,
    symlink: Boolean(node.symlink),
    symlinkTargetKind: node.symlink?.targetType,
    isHidden: node.isHidden,
    extension: node.extension,
  };
}

function rowStateForNode(
  node: FileTreeNode,
  workspacePath: string,
  gitDecorations: FileTreeGitDecorations
): FileTreeRowState | undefined {
  const relativePath = relativeFileTreePath(workspacePath, node.path);
  const fileStatus =
    gitDecorations.fileStatusByPath.get(relativePath) ??
    (node.type === 'directory'
      ? gitDecorations.directoryStatusByPath.get(relativePath)
      : undefined);
  if (!fileStatus && !node.isHidden) return undefined;
  return {
    muted: node.isHidden || fileStatus === 'deleted',
    strikethrough: fileStatus === 'deleted',
    tone: fileStatus ? fileTreeGitStatusTone(fileStatus) : undefined,
  };
}

function relativeFileTreePath(workspacePath: string, nodePath: string): string {
  return normalizeFileTreePath(relativeToWorkspace(workspacePath, nodePath));
}

export function FileTreeGitChangeIndicator({ status }: { status: GitChangeStatus }) {
  return (
    <span
      className="flex size-4 items-center justify-center"
      style={{ color: fileTreeGitStatusColor(status) }}
      aria-label="包含重点项目"
      title="包含重点项目"
    >
      <Circle aria-hidden className="size-2 fill-current opacity-40" strokeWidth={0} />
    </span>
  );
}

export function fileTreeGitStatusTone(status: GitChangeStatus): FileTreeRowState['tone'] {
  switch (status) {
    case 'added':
      return 'success';
    case 'modified':
      return 'warning';
    case 'deleted':
    case 'conflicted':
      return 'error';
    case 'renamed':
      return 'info';
  }
}

function fileTreeGitStatusColor(status: GitChangeStatus): string {
  switch (status) {
    case 'added':
      return 'var(--em-foreground-success)';
    case 'modified':
      return 'var(--em-foreground-warning)';
    case 'deleted':
    case 'conflicted':
      return 'var(--em-foreground-error)';
    case 'renamed':
      return 'var(--em-foreground-diff-modified)';
  }
}

function isPathWithin(path: string, deletedPath: string, closesDescendants: boolean) {
  return closesDescendants
    ? path === deletedPath || path.startsWith(`${deletedPath}/`)
    : path === deletedPath;
}

function basenameFromPath(path: string): string {
  return normalizeFileTreePath(path).slice(normalizeFileTreePath(path).lastIndexOf('/') + 1);
}
