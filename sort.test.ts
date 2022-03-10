import { delay } from "./delay.ts";
import type { Result } from "./types.ts";
import { sort, sortSettled } from "./sort.ts";
import { assertEquals } from "./deps_test.ts";

Deno.test("sort()", async (t) => {
  await t.step("return in order of settled", async () => {
    const results: number[] = [];

    for await (
      const waited of sort(
        [1000, 2000, 500, 1500].map((n, index) => delay(n).then(() => index)),
      )
    ) {
      results.push(waited);
    }

    assertEquals(results, [2, 0, 3, 1]);
  });

  await t.step("ignore errors", async () => {
    const results: number[] = [];

    for await (
      const waited of sort(
        [1000, 2000, 1500, 500].map(async (n, index) => {
          if (index < 2) throw Error(`Error: ${index}`);
          await delay(n);
          return index;
        }),
      )
    ) {
      results.push(waited);
    }

    assertEquals(results, [3, 2]);
  });
});

Deno.test("sortSettled()", async (t) => {
  await t.step("return in order of settled", async () => {
    const results: Result<number>[] = [];

    for await (
      const waited of sortSettled(
        [1000, 2000, 500, 1500].map((n, index) => delay(n).then(() => index)),
      )
    ) {
      results.push(waited);
    }

    assertEquals(results, [
      { success: true, value: 2 },
      { success: true, value: 0 },
      { success: true, value: 3 },
      { success: true, value: 1 },
    ]);
  });

  await t.step("catch errors", async () => {
    const results: Result<number>[] = [];

    for await (
      const waited of sortSettled(
        [1000, 2000, 1500, 500].map(async (n, index) => {
          if (index < 2) throw `Error: ${index}`;
          await delay(n);
          return index;
        }),
      )
    ) {
      results.push(waited);
    }

    assertEquals(results, [
      { success: false, reason: "Error: 0" },
      { success: false, reason: "Error: 1" },
      { success: true, value: 3 },
      { success: true, value: 2 },
    ]);
  });
});
