import { promisify } from "./promisify.ts";
import { assert } from "./deps_test.ts";

Deno.test("promisify()", async (t) => {
  await t.step("without forceQueued", async (t) => {
    await t.step("keep all results", async () => {
      const [get, resolve] = promisify<number>();

      const pending = get();
      resolve(0);
      resolve(1);
      assert(await pending === 0);
      assert(await get() === 1);
      resolve(2);
      assert(await get() === 2);
      resolve(3);
      resolve(4);
      assert(await get() === 3);
      assert(await get() === 4);
      resolve(5);
      resolve(6);
      resolve(7);
      assert(await get() === 5);
      resolve(8);
      assert(await get() === 6);
      assert(await get() === 7);
      assert(await get() === 8);
    });

    await t.step("keep nothing", async () => {
      const [get, resolve] = promisify<number>({ maxQueued: 0 });

      let pending = get();
      resolve(1);
      assert(await pending === 1);
      resolve(2);
      resolve(3);
      pending = get();
      resolve(4);
      assert(await pending === 4);
      pending = get();
      resolve(5);
      resolve(6);
      assert(await pending === 5);
    });

    await t.step("keep the latest result", async () => {
      const [get, resolve] = promisify<number>({ maxQueued: 1 });

      let pending = get();
      resolve(1);
      assert(await pending === 1);
      resolve(2);
      resolve(3);
      assert(await get() === 3);
      resolve(4);
      resolve(5);
      resolve(6);
      assert(await get() === 6);
      pending = get();
      resolve(7);
      resolve(8);
      resolve(9);
      assert(await pending === 7);
      assert(await get() === 9);
    });

    await t.step("keep the latest and second latest results", async () => {
      const [get, resolve] = promisify<number>({ maxQueued: 2 });

      resolve(1);
      let pending = get();
      assert(await pending === 1);
      resolve(2);
      resolve(3);
      assert(await get() === 2);
      assert(await get() === 3);
      resolve(4);
      resolve(5);
      resolve(6);
      assert(await get() === 5);
      resolve(7);
      resolve(8);
      assert(await get() === 7);
      assert(await get() === 8);
      pending = get();
      resolve(9);
      resolve(10);
      resolve(11);
      resolve(12);
      assert(await pending === 9);
      assert(await get() === 11);
      assert(await get() === 12);
    });
  });

  await t.step("with forceQueued", async (t) => {
    await t.step("keep the latest result", async () => {
      const [get, resolve] = promisify<number>({ maxQueued: 1 });

      resolve(1);
      const pending = get();
      assert(await pending === 1);
      resolve(2);
      resolve(20, { forceQueued: true });
      resolve(3);
      resolve(4);
      resolve(30, { forceQueued: true });
      resolve(40, { forceQueued: true });
      assert(await get() === 20);
      assert(await get() === 30);
      assert(await get() === 40);
      assert(await get() === 4);
    });
  });
});
