import { DirectoryField as DirectoryFieldPrimitive } from '@emdash/ui/react/primitives';
import { getHostClient } from '@core/primitives/desktop-host/browser/host-client';

interface DirectoryFieldProps {
  title: string;
  message: string;
  path?: string;
  onPathChange: (path: string) => void;
}

export function DirectoryField({ title, message, onPathChange, path }: DirectoryFieldProps) {
  const handleChooseDirectory = async () => {
    const result = await (await getHostClient()).openSelectDirectoryDialog({ title, message });
    if (result) onPathChange(result);
  };

  return (
    <DirectoryFieldPrimitive
      path={path}
      placeholder="请选择目录"
      chooseLabel="选择"
      onClick={() => void handleChooseDirectory()}
    />
  );
}
