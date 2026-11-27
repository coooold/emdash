import { Button, Dialog, Input, Spinner, Textarea } from '@emdash/ui/react/primitives';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useModalController } from '@core/manifests/browser/modal-api';
import { ConfirmButton } from '@core/primitives/keybindings/browser/confirm-button';
import { defineModal } from '@core/primitives/modals/react';
import { WaitlistBrand } from './waitlist-brand';
import { getWaitlistStore } from './waitlist-store';

// Copy mirrors emdash.com/waitlist.
export const WaitlistModal = observer(function WaitlistModal() {
  const controller = useModalController('waitlistModal');
  const store = getWaitlistStore();
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await store.join(email, note)) controller.complete();
  };

  const onEdit = () => {
    if (store.errorMessage) store.clearError();
  };

  return (
    <>
      <Dialog.Header>
        <Dialog.Title className="sr-only">加入 Emdash 2.0 候补名单</Dialog.Title>
        <WaitlistBrand logoHeight={14} />
      </Dialog.Header>
      <Dialog.Body>
        <form id="waitlist-form" className="pt-0.5" onSubmit={handleSubmit}>
          <h2 className="mb-2.5 text-xl leading-[26px] font-semibold tracking-tight text-foreground">
            支持多种模型、代理工具和基础设施
          </h2>
          <p className="mb-2 text-[13px] leading-[19px] text-foreground-muted">
            面向团队，可在桌面端、网页、移动端或 Slack 中运行和管理编程代理。
          </p>
          <p className="text-[13px] leading-[19px] text-foreground-muted">
            预配置环境、共享密钥、管理凭据并设置支出上限。可以自动化工作流程，并通过 MCP 让代理操作平台。
          </p>

          <label
            htmlFor="waitlist-email"
            className="mt-4 mb-1.5 block text-xs text-foreground-muted"
          >
            工作邮箱
          </label>
          <Input
            id="waitlist-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            disabled={store.submitting}
            onChange={(event) => {
              setEmail(event.target.value);
              onEdit();
            }}
          />

          <label
            htmlFor="waitlist-note"
            className="mt-4 mb-1.5 block text-xs text-foreground-muted"
          >
            还有什么想告诉我们？ <span className="text-foreground-passive">（选填）</span>
          </label>
          <Textarea
            id="waitlist-note"
            rows={3}
            className="resize-none"
            placeholder="介绍你的团队、工作流程或基础设施需求…"
            value={note}
            disabled={store.submitting}
            onChange={(event) => {
              setNote(event.target.value);
              onEdit();
            }}
          />

          {store.errorMessage ? (
            <p className="mt-3 text-xs text-foreground-destructive" role="alert">
              {store.errorMessage}
            </p>
          ) : null}
        </form>
      </Dialog.Body>
      <Dialog.Footer>
        <Button type="button" variant="secondary" onClick={() => controller.dismiss()}>
          暂不加入
        </Button>
        <ConfirmButton
          variant="primary"
          type="submit"
          form="waitlist-form"
          className="gap-2 px-4"
          disabled={store.submitting || email.trim().length === 0}
          aria-busy={store.submitting}
        >
          {store.submitting ? (
            <>
              <Spinner size="sm" />
              <span>正在提交…</span>
            </>
          ) : (
            <span>加入候补名单</span>
          )}
        </ConfirmButton>
      </Dialog.Footer>
    </>
  );
});

export const waitlistModal = defineModal<void>()({
  id: 'waitlistModal',
  component: WaitlistModal,
});
