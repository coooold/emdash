import { ImportStep } from './import-step';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center [-webkit-app-region:drag]">
      <div className="mx-auto flex h-full max-h-[70vh] min-h-0 w-full max-w-5xl flex-col border bg-background-1 [-webkit-app-region:no-drag]">
        <ImportStep onComplete={onComplete} />
      </div>
    </div>
  );
}
