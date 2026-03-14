/**
 * Test utilities for AI course labs.
 * Same pattern as observability-sre-course: createTestRunner with exercise/solution switching.
 */

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

interface TestGroup {
  name: string;
  tests: TestCase[];
}

export function createTestRunner(name: string) {
  const groups: TestGroup[] = [];
  let currentGroup: TestGroup | null = null;

  function describe(groupName: string, fn: () => void) {
    currentGroup = { name: groupName, tests: [] };
    groups.push(currentGroup);
    fn();
    currentGroup = null;
  }

  function it(testName: string, fn: () => void | Promise<void>) {
    if (!currentGroup) {
      throw new Error('it() must be called inside describe()');
    }
    currentGroup.tests.push({ name: testName, fn });
  }

  function expect(actual: any) {
    return {
      toBe(expected: any) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toEqual(expected: any) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toBeGreaterThan(expected: number) {
        if (!(actual > expected)) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeGreaterThanOrEqual(expected: number) {
        if (!(actual >= expected)) {
          throw new Error(`Expected ${actual} to be >= ${expected}`);
        }
      },
      toBeLessThan(expected: number) {
        if (!(actual < expected)) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeLessThanOrEqual(expected: number) {
        if (!(actual <= expected)) {
          throw new Error(`Expected ${actual} to be <= ${expected}`);
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected truthy but got ${JSON.stringify(actual)}`);
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected falsy but got ${JSON.stringify(actual)}`);
        }
      },
      toContain(expected: any) {
        if (typeof actual === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected string to contain "${expected}"`);
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
          }
        }
      },
      toHaveLength(expected: number) {
        if (actual.length !== expected) {
          throw new Error(`Expected length ${expected} but got ${actual.length}`);
        }
      },
      toThrow() {
        if (typeof actual !== 'function') {
          throw new Error('Expected a function');
        }
        try {
          actual();
          throw new Error('Expected function to throw');
        } catch (_e) {
          // OK
        }
      },
      toBeCloseTo(expected: number, precision: number = 2) {
        const pow = Math.pow(10, precision);
        if (Math.round(actual * pow) !== Math.round(expected * pow)) {
          throw new Error(`Expected ${actual} to be close to ${expected} (precision: ${precision})`);
        }
      },
      toBeInstanceOf(expected: any) {
        if (!(actual instanceof expected)) {
          throw new Error(`Expected instance of ${expected.name}`);
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new Error(`Expected undefined but got ${JSON.stringify(actual)}`);
        }
      },
      toMatchObject(expected: Record<string, any>) {
        for (const key of Object.keys(expected)) {
          if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
            throw new Error(
              `Property "${key}": expected ${JSON.stringify(expected[key])} but got ${JSON.stringify(actual[key])}`,
            );
          }
        }
      },
    };
  }

  async function run() {
    let passed = 0;
    let failed = 0;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`${'='.repeat(60)}\n`);

    for (const group of groups) {
      console.log(`  ${group.name}`);
      for (const test of group.tests) {
        try {
          await test.fn();
          passed++;
          console.log(`    ✓ ${test.name}`);
        } catch (e: any) {
          failed++;
          console.log(`    ✗ ${test.name}`);
          console.log(`      → ${e.message}`);
        }
      }
      console.log();
    }

    console.log(`${'─'.repeat(60)}`);
    console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log(`${'─'.repeat(60)}\n`);

    if (failed > 0) process.exit(1);
  }

  return { describe, it, expect, run };
}
