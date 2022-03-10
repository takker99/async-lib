export type Result<T, E = unknown> = { success: true; value: T } | {
  success: false;
  reason: E;
};
