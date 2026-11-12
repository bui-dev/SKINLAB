import assert from "node:assert/strict";
import nodeTest, {
  after as nodeAfter,
  before as nodeBefore,
  describe as nodeDescribe,
} from "node:test";

export type TestFn = () => void | Promise<void>;

interface ExpectChain<T> {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toBeDefined(): void;
  toBeLessThanOrEqual(expected: number): void;
  not: {
    toBe(expected: unknown): void;
  };
  toThrow(expected?: string | RegExp): void;
  rejects: {
    toThrow(expected?: string | RegExp): Promise<void>;
  };
}

export function expect<T>(actual: T): ExpectChain<T> {
  return {
    toBe(expected: unknown) {
      assert.equal(actual, expected);
    },
    toEqual(expected: unknown) {
      assert.deepEqual(actual, expected);
    },
    toBeDefined() {
      assert.notEqual(actual, undefined);
    },
    toBeLessThanOrEqual(expected: number) {
      assert.ok(
        typeof actual === "number" && actual <= expected,
        `Expected ${actual} to be less than or equal to ${expected}`,
      );
    },
    not: {
      toBe(expected: unknown) {
        assert.notEqual(actual, expected);
      },
    },
    toThrow(expected?: string | RegExp) {
      assert.ok(
        typeof actual === "function",
        "expect(fn).toThrow() requires a function",
      );
      if (!expected) {
        assert.throws(actual as () => void);
        return;
      }
      const regex = expected instanceof RegExp ? expected : new RegExp(expected);
      assert.throws(actual as () => void, regex);
    },
    rejects: {
      async toThrow(expected?: string | RegExp) {
        assert.ok(
          actual && typeof (actual as any).then === "function",
          "expect(promise).rejects.toThrow() requires a promise",
        );
        if (!expected) {
          await assert.rejects(actual as Promise<unknown>);
          return;
        }
        const regex = expected instanceof RegExp ? expected : new RegExp(expected);
        await assert.rejects(actual as Promise<unknown>, regex);
      },
    },
  };
}

export const test = Object.assign(
  function (name: string, fn: TestFn) {
    return nodeTest(name, fn);
  },
  {
    describe(name: string, fn: () => void) {
      return nodeDescribe(name, fn);
    },
    beforeAll(fn: TestFn) {
      return nodeBefore(fn);
    },
    afterAll(fn: TestFn) {
      return nodeAfter(fn);
    },
  },
);

