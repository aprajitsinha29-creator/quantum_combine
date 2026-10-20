/**
 * Tests for the embed-detection helper: true inside a parent window
 * (Ananta's Careers iframe) and false standalone. window.parent is redefined
 * with Object.defineProperty like useAnantaBridge.test.tsx does, then
 * restored to the plain parent-to-window property after each test.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { isEmbedded } from './embed';

let parentWasStubbed = false;

function stubParent(value: Partial<Window>): void {
  Object.defineProperty(window, 'parent', { configurable: true, value });
  parentWasStubbed = true;
}

afterEach(() => {
  if (parentWasStubbed) {
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    parentWasStubbed = false;
  }
});

describe('isEmbedded', () => {
  it('test_is_false_for_the_jsdom_default_standalone_window', () => {
    // Default jsdom window: parent === window, no stubbing needed.
    expect(isEmbedded()).toBe(false);
  });

  it('test_is_true_when_the_window_has_a_distinct_parent', () => {
    stubParent({ postMessage: () => {} });
    expect(isEmbedded()).toBe(true);
  });
});
