import type { Result } from "./types.ts";

export interface CallbackOptions {
  forceQueued?: boolean;
}

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
  (value: T, options?: CallbackOptions) => void,
  (reason: E, options?: CallbackOptions) => void,
] {
  const maxQueued = options?.maxQueued === undefined
    ? undefined
    : Math.max(0, options.maxQueued);

  const queue = [] as Result<T, E>[];
  const queue2 = [] as Result<T, E>[];
  let _resolve: ((value: T, options?: CallbackOptions) => void) | undefined;
  let _reject: ((value: E, options?: CallbackOptions) => void) | undefined;

  /** queueから一つ取り出す。空なら_resolveをセットする */
  const waitForSettled = async () => {
    if (maxQueued !== undefined) queue.splice(0, queue.length - maxQueued);
    const value = queue2.shift() ?? queue.shift();
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
  const resolve = (value: T, options?: CallbackOptions) => {
    if (!_resolve) {
      if (options?.forceQueued) {
        queue2.push({ success: true, value });
      } else {
        queue.push({ success: true, value });
      }
      return;
    }
    _resolve(value);
    _resolve = _reject = undefined;
  };
  const reject = (reason: E, options?: CallbackOptions) => {
    if (!_reject) {
      if (options?.forceQueued) {
        queue2.push({ success: false, reason });
      } else {
        queue.push({ success: false, reason });
      }
      return;
    }
    _reject(reason);
    _resolve = _reject = undefined;
  };

  return [waitForSettled, resolve, reject] as const;
}
