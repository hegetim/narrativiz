/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";

export function* windows2<T>(array: T[]) {
  for (let i = 0; i + 2 <= array.length; i++) {
    yield [array[i], array[i + 1]] as readonly [T, T];
  }
}

type Body<T extends { kind: K; }, K extends string, R> =
  { [P in T['kind']]: (t: T extends { kind: P; } ? T : never) => R };

export const matchByKind = <T extends { kind: K }, K extends string, R>(t: T, body: Body<T, K, R>): R => {
  return body[t.kind](t as any);
}

export const matchString = <K extends string, R>(k: K, body: { [P in K]: () => R }) => {
  return body[k]();
}

export const pushMMap = <K, T>(mmap: Map<K, T[]>, key: K, ...items: T[]) => {
  const bag = mmap.get(key);
  if (bag) { bag.push(...items); }
  else { mmap.set(key, items); }
}

export const ifDefined = <T, R>(t: T | undefined, f: (t: T) => R): R | undefined => t === undefined ? undefined : f(t);

export type ClassNames = (string | { [index: string]: boolean })[];
export const cls = (...names: ClassNames) => {
  const joined = names.flatMap(name =>
    _.isString(name) ? [name] : _.toPairs(name).filter(([_, flag]) => flag).map(([s, _]) => s)
  ).join(" ");
  return { className: joined };
}

export const unimplemented = () => { throw new Error('not implemented'); }
export const unreachable = () => { throw new Error('unreachable code'); }
