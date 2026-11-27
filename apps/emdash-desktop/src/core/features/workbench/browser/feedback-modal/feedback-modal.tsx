import {
  Button,
  Checkbox,
  Dialog,
  Input,
  Spinner,
  Textarea,
  Tooltip,
} from '@emdash/ui/react/primitives';
import { useQuery } from '@tanstack/react-query';
import { ImageIcon, Info, Paperclip, XIcon } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { getUpdateStore } from '@core/features/updates/contributions/app-stores';
import { useModalController } from '@core/manifests/browser/modal-api';
import { getHostClient } from '@core/primitives/desktop-host/browser/host-client';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { defineModal } from '@core/primitives/modals/react';
import { useAttachments } from '@core/primitives/react-hooks/browser/use-attachments';
import { cn } from '@core/primitives/styling/browser/cn';
import { useFeedbackSubmit } from './use-feedback-submit';

type FeedbackModalArgs = {
  blurb?: string;
};

function AttachmentThumbnail({
  name,
  previewUrl,
  onRemove,
  disabled,
}: {
  name: string;
  previewUrl: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="group relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-background">
      <img src={previewUrl} alt={name} className="size-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`移除 ${name}`}
        disabled={disabled}
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:enabled:opacity-100 disabled:cursor-not-allowed"
      >
        <XIcon className="size-3.5 text-white" />
      </button>
    </div>
  );
}

export function FeedbackModal({ blurb }: FeedbackModalArgs) {
  const controller = useModalController('feedbackModal');
  const [includeDiagnosticLogs, setIncludeDiagnosticLogs] = useState(false);
  const appVersion = getUpdateStore().currentVersion;
  const { data: platformDisplayName } = useQuery({
    queryKey: ['app', 'platformDisplayName'],
    queryFn: async () => (await getHostClient()).getPlatformDisplayName(),
    staleTime: Infinity,
  });
  const {
    attachments,
    isDraggingOver,
    fileInputRef,
    removeAttachment,
    openFilePicker,
    handleFileInputChange,
    handlePaste,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    reset: resetAttachments,
  } = useAttachments();

  const {
    feedbackDetails,
    setFeedbackDetails,
    contactEmail,
    setContactEmail,
    submitting,
    errorMessage,
    contactEmailError,
    clearError,
    clearContactEmailError,
    handleSubmit,
    canSubmit,
  } = useFeedbackSubmit({
    appVersion,
    platformDisplayName,
    onSuccess: () => {
      resetAttachments();
      setIncludeDiagnosticLogs(false);
      controller.complete();
    },
  });

  const handleFormSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const loadDiagnosticLog = includeDiagnosticLogs
        ? async () => {
            const attachment = await (await getHostClient()).getDiagnosticLogAttachment();
            return new File([attachment.content], attachment.filename, {
              type: attachment.mimeType,
            });
          }
        : undefined;
      await handleSubmit(
        attachments.map((attachment) => attachment.file),
        loadDiagnosticLog
      );
    },
    [handleSubmit, attachments, includeDiagnosticLogs]
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {isDraggingOver && (
        <div className="border-primary bg-primary/5 absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed">
          <div className="text-primary flex flex-col items-center gap-1">
            <ImageIcon className="size-6" />
            <span className="text-xs font-medium">将图片拖放到此处</span>
          </div>
        </div>
      )}
      <Dialog.Header>
        <div className="flex flex-col gap-1">
          <Dialog.Title>反馈</Dialog.Title>
          {blurb ? <Dialog.Description className="text-xs">{blurb}</Dialog.Description> : null}
        </div>
      </Dialog.Header>
      <Dialog.Body>
        <form id="feedback-form" className="space-y-4 pt-0.5" onSubmit={handleFormSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="feedback-details" className="sr-only">
              反馈内容
            </label>
            <Textarea
              id="feedback-details"
              autoFocus
              rows={5}
              placeholder="你喜欢哪些功能？我们还能如何改进？"
              className="resize-none"
              value={feedbackDetails}
              onChange={(event) => {
                setFeedbackDetails(event.target.value);
                if (errorMessage) clearError();
              }}
              onPaste={handlePaste}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="feedback-contact" className="sr-only">
              联系邮箱
            </label>
            <Input
              id="feedback-contact"
              type="text"
              placeholder="name@example.com（选填）"
              value={contactEmail}
              aria-invalid={contactEmailError ? 'true' : undefined}
              aria-describedby={contactEmailError ? 'feedback-contact-error' : undefined}
              onChange={(event) => {
                setContactEmail(event.target.value);
                if (errorMessage) clearError();
                if (contactEmailError) clearContactEmailError();
              }}
            />
            {contactEmailError ? (
              <p
                id="feedback-contact-error"
                className="text-xs text-foreground-destructive"
                role="alert"
              >
                {contactEmailError}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeDiagnosticLogs}
                  onCheckedChange={(checked) => setIncludeDiagnosticLogs(Boolean(checked))}
                  disabled={submitting}
                />
                <span className="min-w-0">附上诊断日志</span>
              </label>
              <Tooltip.Provider delay={150}>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className="text-muted-foreground mt-1 inline-flex size-4 items-center justify-center hover:text-foreground"
                      aria-label="查看诊断日志说明"
                    >
                      <Info className="size-3.5" aria-hidden="true" />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" className="max-w-xs text-xs">
                    附上近期应用日志，其中的敏感信息已隐去。
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              multiple
              onChange={handleFileInputChange}
              disabled={submitting}
            />
            {attachments.length > 0 ? (
              <div
                className={cn(
                  'flex flex-wrap gap-2 rounded-md border border-dashed border-border p-2',
                  submitting && 'opacity-50'
                )}
              >
                {attachments.map((attachment, index) => (
                  <AttachmentThumbnail
                    key={attachment.id}
                    name={attachment.file.name}
                    previewUrl={attachment.previewUrl}
                    onRemove={() => removeAttachment(index)}
                    disabled={submitting}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {errorMessage ? (
            <p className="text-destructive text-sm" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </Dialog.Body>
      <Dialog.Footer className="sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={openFilePicker}
          className="gap-2"
          disabled={submitting}
        >
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          <span>附加图片</span>
        </Button>
        <ConfirmButton
          variant="primary"
          type="submit"
          form="feedback-form"
          className="gap-2 px-4"
          disabled={!canSubmit}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Spinner size="sm" />
              <span>正在发送…</span>
            </>
          ) : (
            <span>发送反馈</span>
          )}
        </ConfirmButton>
      </Dialog.Footer>
    </div>
  );
}

export const feedbackModal = defineModal<void>()({
  id: 'feedbackModal',
  component: FeedbackModal,
});
