import { delay } from "./delay.ts";
import { pool } from "./pool.ts";
import { assert, assertEquals, assertStringIncludes } from "./deps_test.ts";

Deno.test("pool()", async (t) => {
  await t.step("order", async () => {
    const start = new Date();
    const results = pool(
      2,
      [1, 2, 3],
      (i, id) => delay(1000).then(() => [i, id]),
    );
    const list = await Promise.all(results);

    const diff = new Date().getTime() - start.getTime();
    assert(diff >= 2000);
    assert(diff < 3000);

    assertEquals(
      list.flatMap((result) => result.success ? [result.value] : []),
      [
        [1, 0],
        [2, 1],
        [3, 0],
      ],
    );
  });

  await t.step("error", async () => {
    async function mapNumber(n: number): Promise<number> {
      if (n <= 2) throw new Error(`Bad number: ${n}`);
      await delay(100);
      return n;
    }
    const mappedNumbers: number[] = [];
    const errors: unknown[] = [];
    for (const promise of pool(3, [1, 2, 3, 4], mapNumber)) {
      const m = await promise;
      if (m.success) {
        mappedNumbers.push(m.value);
      } else {
        errors.push(m.reason);
      }
    }

    assertEquals(errors.length, 2);
    assert(errors[0] instanceof Error);
    assert(errors[1] instanceof Error);
    assertStringIncludes(errors[0].stack ?? "", "Error: Bad number: 1");
    assertStringIncludes(errors[1].stack ?? "", "Error: Bad number: 2");
    assertEquals(mappedNumbers, [3, 4]);
  });
});
