/**
 * Escape user input before it is used inside a RegExp.
 * Prevents both invalid-pattern 500s and pathological backtracking.
 */
export const escapeRegex = (input = "") =>
  String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default escapeRegex;
