import { useState } from 'react';

export function useProjectName(generatedName: string) {
  const [name, setName] = useState('');
  const trimmedName = name.trim();
  const trimmedGeneratedName = generatedName.trim();

  return {
    name,
    placeholder: generatedName || '项目名称',
    effectiveName: trimmedName || trimmedGeneratedName,
    handleNameChange: setName,
  };
}
