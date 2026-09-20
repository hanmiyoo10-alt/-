import { readFile, stat } from 'node:fs/promises';

export const REVEAL_PLAN_BYTE_LIMIT = 16 * 1024;
export const REVEAL_ACTION_LIMIT = 5;
export const REVEAL_SELECTOR_LIMIT = 512;
export const REVEAL_ACTION_TIMEOUT_DEFAULT = 2_000;
export const REVEAL_ACTION_TIMEOUT_MAX = 5_000;
export const REVEAL_TOTAL_BUDGET_MS = 12_000;

export class RevealPlanError extends Error {
  constructor(code) {
    super(code);
    this.name = 'RevealPlanError';
    this.code = code;
  }
}

function planError(code = 'REVEAL_PLAN_INVALID') {
  throw new RevealPlanError(code);
}

function exactKeys(value, allowed) {
  const keys = Object.keys(value);
  return keys.every((key) => allowed.includes(key));
}
export function normalizeRevealPlan(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) planError();
  if (!exactKeys(input, ['version', 'actions'])) planError();
  if (input.version !== 1 || !Array.isArray(input.actions)) planError();
  if (input.actions.length < 1) planError();
  if (input.actions.length > REVEAL_ACTION_LIMIT) {
    planError('REVEAL_ACTION_LIMIT_EXCEEDED');
  }

  return {
    version: 1,
    actions: input.actions.map((action) => {
      if (!action || typeof action !== 'object' || Array.isArray(action)) planError();
      if (!exactKeys(action, ['type', 'selector', 'timeoutMs'])) planError();
      if (!['clickReveal', 'waitFor'].includes(action.type)) planError();
      if (typeof action.selector !== 'string'
          || action.selector.length < 1
          || action.selector.length > REVEAL_SELECTOR_LIMIT
          || action.selector.includes('\0')
          || action.selector.includes('>>')) planError();
      const timeoutMs = action.timeoutMs ?? REVEAL_ACTION_TIMEOUT_DEFAULT;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1
          || timeoutMs > REVEAL_ACTION_TIMEOUT_MAX) planError();
      return { type: action.type, selector: action.selector, timeoutMs };
    }),
  };
}
export async function loadRevealPlanFile(filePath) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    throw new RevealPlanError('REVEAL_PLAN_INVALID');
  }
  if (!info.isFile()) throw new RevealPlanError('REVEAL_PLAN_INVALID');
  if (info.size > REVEAL_PLAN_BYTE_LIMIT) {
    throw new RevealPlanError('REVEAL_PLAN_TOO_LARGE');
  }
  const raw = await readFile(filePath);
  if (raw.byteLength > REVEAL_PLAN_BYTE_LIMIT) {
    throw new RevealPlanError('REVEAL_PLAN_TOO_LARGE');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    throw new RevealPlanError('REVEAL_PLAN_INVALID');
  }
  return normalizeRevealPlan(parsed);
}

function mapLocatorError(error) {
  return error?.name === 'TimeoutError'
    ? 'REVEAL_ACTION_TIMEOUT'
    : 'REVEAL_PLAN_INVALID';
}
async function resolveVisibleTarget(page, selector) {
  let locator;
  let count;
  try {
    locator = page.locator('css=' + selector);
    count = await locator.count();
  } catch (error) {
    return { reason: mapLocatorError(error) };
  }
  if (count === 0) return { reason: 'REVEAL_SELECTOR_NOT_FOUND' };
  if (count !== 1) return { reason: 'REVEAL_SELECTOR_AMBIGUOUS' };

  const visible = [];
  for (let index = 0; index < count; index += 1) {
    try {
      if (await locator.nth(index).isVisible()) visible.push(index);
    } catch (error) {
      return { reason: mapLocatorError(error) };
    }
    if (visible.length > 1) return { reason: 'REVEAL_SELECTOR_AMBIGUOUS' };
  }
  if (visible.length === 0) return { reason: 'REVEAL_SELECTOR_NOT_VISIBLE' };
  return { locator: locator.nth(visible[0]) };
}

async function classifyRevealControl(locator) {
  return locator.evaluate((node) => {
    const element = node instanceof Element ? node : null;
    if (!element) return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    const anchor = element.closest('a[href]');
    const editable = element.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
    if (anchor || editable) {
      return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    const controller = element.closest('button,summary,[role="button"],[role="tab"]');
    if (!controller) return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    if (controller.closest('a[href]') || controller.hasAttribute('download')
        || controller.hasAttribute('formaction')) {
      return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }

    const tag = controller.tagName.toLowerCase();
    if (tag === 'summary') {
      return controller.parentElement?.tagName.toLowerCase() === 'details'
        ? { allowed: true }
        : { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    if (tag === 'button') {
      const formOwned = Boolean(controller.form);
      const explicitType = controller.getAttribute('type');
      const allowed = !formOwned || explicitType?.toLowerCase() === 'button';
      return allowed ? { allowed: true }
        : { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    const role = controller.getAttribute('role')?.toLowerCase();
    if (!['button', 'tab'].includes(role)) {
      return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    if (controller.tagName.toLowerCase() === 'a' || controller.closest('form')) {
      return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    if (controller.closest('[contenteditable]:not([contenteditable="false"])')) {
      return { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    return { allowed: true };
  });
}

function actionRecord(index, action, status, reason = null) {
  return {
    index,
    type: action.type,
    selector: action.selector,
    status,
    reason,
  };
}

function failedResult(actionResults, actionsExecuted, failureReason) {
  return { ok: false, actionResults, actionsExecuted, failureReason };
}
export async function executeRevealPlan(page, plan, effectGuard) {
  const normalized = normalizeRevealPlan(plan);
  const actionResults = [];
  let actionsExecuted = 0;
  const deadline = Date.now() + REVEAL_TOTAL_BUDGET_MS;

  for (let index = 0; index < normalized.actions.length; index += 1) {
    const action = normalized.actions[index];
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      actionResults.push(actionRecord(index, action, 'FAILED', 'REVEAL_ACTION_TIMEOUT'));
      return failedResult(actionResults, actionsExecuted, 'REVEAL_ACTION_TIMEOUT');
    }
    const timeout = Math.min(action.timeoutMs, remaining);

    if (action.type === 'waitFor') {
      const waitDeadline = Date.now() + timeout;
      let target;
      do {
        target = await resolveVisibleTarget(page, action.selector);
        if (target.locator || target.reason === 'REVEAL_SELECTOR_AMBIGUOUS'
            || target.reason === 'REVEAL_PLAN_INVALID') break;
        const waitRemaining = waitDeadline - Date.now();
        if (waitRemaining <= 0) break;
        await page.waitForTimeout(Math.min(25, waitRemaining));
      } while (Date.now() < waitDeadline);
      if (!target?.locator) {
        const reason = target?.reason ?? 'REVEAL_ACTION_TIMEOUT';
        actionResults.push(actionRecord(index, action, 'FAILED', reason));
        return failedResult(actionResults, actionsExecuted, reason);
      }
      actionResults.push(actionRecord(index, action, 'OK'));
      actionsExecuted += 1;
      continue;
    }
    const target = await resolveVisibleTarget(page, action.selector);
    if (!target.locator) {
      actionResults.push(actionRecord(index, action, 'FAILED', target.reason));
      return failedResult(actionResults, actionsExecuted, target.reason);
    }
    let classification;
    try {
      classification = await classifyRevealControl(target.locator);
    } catch {
      classification = { allowed: false, reason: 'REVEAL_CONTROL_FORBIDDEN' };
    }
    if (!classification.allowed) {
      const reason = classification.reason ?? 'REVEAL_CONTROL_FORBIDDEN';
      actionResults.push(actionRecord(index, action, 'BLOCKED', reason));
      return failedResult(actionResults, actionsExecuted, reason);
    }

    try {
      await target.locator.click({ timeout });
      await page.waitForTimeout(Math.min(25, Math.max(1, deadline - Date.now())));
      await effectGuard.flushRevealEffects?.();
      await effectGuard.waitForBlockedEffect?.(
        Math.min(250, Math.max(0, deadline - Date.now())),
      );
    } catch (error) {
      const blocked = effectGuard.firstBlockedReason();
      const reason = blocked ?? (error?.name === 'TimeoutError'
        ? 'REVEAL_ACTION_TIMEOUT' : 'REVEAL_ACTION_FAILED');
      actionResults.push(actionRecord(index, action, blocked ? 'BLOCKED' : 'FAILED', reason));
      return failedResult(actionResults, actionsExecuted, reason);
    }

    const blocked = effectGuard.firstBlockedReason();
    if (blocked) {
      actionResults.push(actionRecord(index, action, 'BLOCKED', blocked));
      return failedResult(actionResults, actionsExecuted, blocked);
    }
    actionResults.push(actionRecord(index, action, 'OK'));
    actionsExecuted += 1;
  }

  return { ok: true, actionResults, actionsExecuted, failureReason: null };
}
