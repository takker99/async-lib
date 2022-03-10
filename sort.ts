import type { Result } from "./types.ts";
import { promisify } from "./promisify.ts";

/** settleしたPromiseから順番に返す関数
 *
 * @param list Promiseのリスト
 */
export async function* sortSettled<T, E = unknown>(
  list: Promise<T>[],
): AsyncGenerator<Result<T, E>, void, unknown> {
  const [shift, push] = promisify<Result<T, E>>();

  /** Promiseが解決したらqueueにいれるよう仕掛けておく */
  for (const item of list) {
    item.then((value) =>
      push({
        success: true,
        value,
      })
    )
      .catch((reason: E) =>
        push({
          success: false,
          reason,
        })
      );
  }

  /** 終わったものから順次返す */
  for (let i = 0; i < list.length; i++) {
    yield await shift();
  }
}

/** 解決したPromiseから順番に返す関数
 *
 * 例外は全て無視する
 *
 * @param list Promiseのリスト
 */
export async function* sort<T>(
  list: Promise<T>[],
): AsyncGenerator<T, void, unknown> {
  const [shift, push] = promisify<T>();
  let count = 0;

  /** Promiseが解決したらqueueにいれるよう仕掛けておく */
  for (const item of list) {
    count++;
    item.then((value) => push(value)).catch(() => count--);
  }

  /** 終わったものから順次返す */
  for (let i = 0; i < count; i++) {
    yield await shift();
  }
}
