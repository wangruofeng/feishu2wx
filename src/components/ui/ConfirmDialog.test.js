import React, { act } from 'react';
import { confirmAction } from './ConfirmDialog';

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

test('cancel is focused and returns false, restoring focus to the trigger', async () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  let result;
  await act(async () => { result = confirmAction('确定删除吗？'); });
  const buttons = document.querySelectorAll('dialog button');
  expect(document.activeElement).toBe(buttons[0]);
  await act(async () => { buttons[0].click(); });
  expect(await result).toBe(false);
  expect(document.activeElement).toBe(trigger);
  expect(document.querySelector('dialog')).toBeNull();
  trigger.remove();
});

test('only explicit confirmation returns true and duplicate requests are cancelled', async () => {
  let result;
  await act(async () => { result = confirmAction('确定清空吗？'); });
  expect(await confirmAction('重复操作')).toBe(false);
  await act(async () => { document.querySelectorAll('dialog button')[1].click(); });
  expect(await result).toBe(true);
});

test('Escape cancel event dismisses without confirming', async () => {
  let result;
  await act(async () => { result = confirmAction('确定覆盖吗？'); });
  await act(async () => {
    document.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true }));
  });
  expect(await result).toBe(false);
});
