import type { Result } from "./types.ts";

export interface PromisifyOptions {
  /** callbackから次の値を取り出すまでに実行されたcallbackの結果を最新でいくつまで保持するかを表す値
   *
   * - 最後に実行された値だけを残したいときは`1`を指定する
   * - 一つも残したくないときは`0`を指定する
   * - 全部残したいときはundefinedを指定する
   *   - これが既定の動作
   *
   * @default undefined
   */
  maxQueued?: number | undefined;
}
/** callbackをPromiseに変換するやつ
 *
 * @return 左から順に、Promiseを返すやつ、正常値を受け取るcallback、異常値を受け取るcallback
 */
export function promisify<T, E = unknown>(
  options?: PromisifyOptions,
): readonly [
  () => Promise<T>,
  (value: T) => void,
  (reason: E) => void,
] {
  const maxQueued = options?.maxQueued === undefined
    ? undefined
    : Math.max(0, options.maxQueued);
  if (maxQueued === 0) return promisifyWithoutQueue();

  const queue = [] as Result<T, E>[];
  let _resolve: ((value: T) => void) | undefined;
  let _reject: ((value: E) => void) | undefined;

  /** queueから一つ取り出す。空なら_resolveをセットする */
  const waitForSettled = async () => {
    if (maxQueued !== undefined) queue.splice(0, queue.length - maxQueued);
    const value = queue.shift();
    if (value) {
      if (value.success) return value.value;
      throw value.reason;
    }

    return await new Promise<T>(
      (res, rej) => {
        _resolve = res;
        _reject = rej;
      },
    );
  };
  const resolve = (value: T) => {
    if (!_resolve) {
      queue.push({ success: true, value });
      return;
    }
    _resolve(value);
    _resolve = _reject = undefined;
  };
  const reject = (value: E) => {
    if (!_reject) {
      queue.push({ success: false, reason: value });
      return;
    }
    _reject(value);
    _resolve = _reject = undefined;
  };

  return [waitForSettled, resolve, reject] as const;
}

function promisifyWithoutQueue<T, E = unknown>(): readonly [
  () => Promise<T>,
  (value: T) => void,
  (reason: E) => void,
] {
  let _resolve: ((value: T) => void) | undefined;
  let _reject: ((value: E) => void) | undefined;

  const waitForSettled = () =>
    new Promise<T>(
      (res, rej) => {
        _resolve = res;
        _reject = rej;
      },
    );
  const resolve = (value: T) => _resolve?.(value);
  const reject = (value: E) => _reject?.(value);

  return [waitForSettled, resolve, reject] as const;
}
