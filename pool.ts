import type { Result } from "./types.ts";

export function* pool<T, U, E = unknown>(
  threshold: number,
  args: Iterable<T>,
  func: (value: T, id: number) => Promise<U>,
): Generator<Promise<Result<U, E>>, void, unknown> {
  let running = 0;
  const waitings = [] as ((value: number | PromiseLike<number>) => void)[];
  const waitForReady = async () => {
    running++;
    if (running <= threshold) return running - 1;
    return await new Promise<number>(
      (resolve) => waitings.push(resolve),
    );
  };
  for (const arg of args) {
    yield (async () => {
      const id = await waitForReady();
      try {
        return {
          success: true,
          value: await func(arg, id),
        };
      } catch (e: unknown) {
        return {
          success: false,
          reason: e as E,
        };
      } finally {
        running--;
        waitings.shift()?.(id);
      }
    })();
  }
  // 実行しきれない可能性はある？
}
