/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash"
import { matchByKind, unreachable } from "./Utils"

interface QPMethods<F extends QPMethods<F>> {
  readonly plus: <T extends QPTerm>(other: T) => T extends F ? F : QPQuadratic
  readonly minus: <T extends QPTerm>(other: T) => T extends F ? F : QPQuadratic
  readonly negate: () => F
  readonly scale: (other: number) => F
  readonly lessThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly greaterThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly equalTo: (other: QPTerm) => QPConstraint,
}

interface QPMethodsMulti {
  readonly squared: () => QPQuadratic
  readonly times: (other: QPLinear) => QPQuadratic
}

type QPLinear = { kind: 'linear', varIds: string[], a: number[], c: number } & QPMethods<QPLinear> & QPMethodsMulti;
type QPQuadratic = { kind: 'quadratic', varIds: string[], m: number[][], lin: QPLinear } & QPMethods<QPQuadratic>;

type QPTerm = QPLinear | QPQuadratic;

type QPConstraint = {
  kind: '<=' | '=='
  left: QPTerm
  right: number
}

export const qpNum = (value: number): QPLinear => linear([], [], value);

export const qpVar = (id: string): QPLinear => linear([id], [1], 0);

const linear = (varIds: string[], a: number[], c: number): QPLinear => ({
  ...{ varIds, a, c },
  kind: 'linear',
  plus: other => other.kind === 'linear' ? plusL(linear(varIds, a, c), other) : plus(linear(varIds, a, c), other) as any,
  minus: other => other.kind === 'linear' ? plusL(linear(varIds, a, c), other.negate()) : plus(linear(varIds, a, c), other) as any,
  negate: () => linear(varIds, a.map(x => -x), -c),
  scale: other => linear(varIds, a.map(x => other * x), other * c),
  times: other => timesLin(linear(varIds, a, c), other),
  squared: () => timesLin(linear(varIds, a, c), linear(varIds, a, c)),
  lessThanOrEqual: other => constraint('<=', linear(varIds, a, c), other),
  greaterThanOrEqual: other => constraint('<=', other, linear(varIds, a, c)),
  equalTo: other => constraint('==', linear(varIds, a, c), other),
});

const quadratic = (varIds: string[], m: number[][], lin: QPLinear): QPQuadratic => ({
  ...{ varIds, m, lin },
  kind: 'quadratic',
  plus: other => plus(quadratic(varIds, m, lin), other),
  minus: other => plus(quadratic(varIds, m, lin), other.negate()),
  negate: () => quadratic(varIds, m.map(l => l.map(x => -x)), lin.negate()),
  scale: other => quadratic(varIds, m.map(l => l.map(x => other * x)), lin.scale(other)),
  lessThanOrEqual: other => constraint('<=', quadratic(varIds, m, lin), other),
  greaterThanOrEqual: other => constraint('<=', other, quadratic(varIds, m, lin)),
  equalTo: other => constraint('==', quadratic(varIds, m, lin), other),
})

const constraint = (kind: QPConstraint['kind'], left: QPTerm, right: QPTerm): QPConstraint =>
  ({ kind, left: left.minus(right), right: 0 });

const plus = (a: QPTerm, b: QPTerm): QPQuadratic => matchByKind(a, {
  linear: a => matchByKind(b, {
    linear: b => quadratic([], [], plusL(a, b)),
    quadratic: b => ({ ...b, lin: plusL(b.lin, a) }),
  }),
  quadratic: a => matchByKind(b, {
    linear: b => ({ ...a, lin: plusL(a.lin, b) }),
    quadratic: b => plusQ(a, b),
  }),
});

const plusL = (a: QPLinear, b: QPLinear): QPLinear => {
  const ids: string[] = [];
  const params: number[] = [];
  a.varIds.forEach((id, i) => {
    const inB = b.varIds.indexOf(id);
    ids.push(id);
    if (inB === -1) { params.push(a.a[i]!); }
    else { params.push(a.a[i]! + b.a[inB]!); }
  });
  b.varIds.forEach((id, i) => {
    const inA = a.varIds.indexOf(id);
    if (inA === -1) {
      ids.push(id);
      params.push(b.a[i]!);
    }
  });
  return linear(ids, params, a.c + b.c);
}

type QPQItem = ({ from: 'a', inA: number }
  | { from: 'b', inB: number }
  | { from: 'ab', inA: number, inB: number }
) & { id: string };

const qpqItems = (aIds: string[], bIds: string[]) => {
  const ids: QPQItem[] = [];
  aIds.forEach((id, inA) => {
    const inB = bIds.indexOf(id);
    if (inB === -1) { ids.push({ id, from: 'a', inA }); }
    else { ids.push({ id, from: 'ab', inA, inB }); }
  });
  bIds.forEach((id, inB) => {
    const inA = aIds.indexOf(id);
    if (inA === -1) { ids.push({ id, from: 'b', inB }); }
  });
  return ids;
}

const getM = (m: number[][], i: number, j: number) => j < i ? m[i]![j]! : m[i]![j]!;

const plusQ = (a: QPQuadratic, b: QPQuadratic): QPQuadratic => {
  const items = qpqItems(a.varIds, b.varIds);
  const m = items.map((i, idx) => _.take(items, idx + 1).map(j => {
    if (i.from === 'a' && j.from === 'b' || i.from === 'b' && j.from === 'a') { return 0; }
    if (i.from === 'ab' && j.from === 'ab') { return getM(a.m, i.inA, j.inA) + getM(b.m, i.inB, j.inB); }
    if (i.from === 'a' && j.from === 'a' || i.from === 'a' && j.from === 'ab' || i.from === 'ab' && j.from === 'a') {
      return getM(a.m, i.inA, j.inA);
    }
    if (i.from === 'b' && j.from === 'b' || i.from === 'b' && j.from === 'ab' || i.from === 'ab' && j.from === 'b') {
      return getM(b.m, i.inB, j.inB);
    }
    return unreachable();
  }));
  return quadratic(items.map(i => i.id), m, plusL(a.lin, b.lin));
}

const timesLin = (a: QPLinear, b: QPLinear): QPQuadratic => {
  const items = qpqItems(a.varIds, b.varIds);
  const m = items.map((i, num) => _.take(items, num + 1).map(j => {
    if (i.from === 'a' && j.from === 'a' || i.from === 'b' && j.from === 'b') { return 0; }
    if (i.from === 'ab' && j.from === 'ab') {
      if (i.id === j.id) { return a.a[i.inA]! * b.a[i.inB]!; }
      else return a.a[i.inA]! * b.a[j.inB]! + a.a[j.inA]! * b.a[i.inB]!;
    }
    if (i.from === 'a' && (j.from === 'b' || j.from === 'ab') || i.from === 'ab' && j.from === 'b') {
      return a.a[i.inA]! * b.a[j.inB]!;
    }
    if (i.from === 'b' && (j.from === 'a' || j.from === 'ab') || i.from === 'ab' && j.from === 'a') {
      return a.a[j.inA]! * b.a[i.inB]!;
    }
    return unreachable();
  }));
  const lin = plusL(a.scale(b.c), b.scale(a.c))
  return quadratic(items.map(i => i.id), m, lin.minus(linear([], [], a.c * b.c)))
}

// REMEMBER: j <= i

export const stringify = (t: QPTerm): string => matchByKind(t, {
  linear: l => _.zip(l.varIds, l.a).map(([id, m]) => `${m} ${id}`).join(" + ") + ` + ${l.c}`,
  quadratic: q => ""
})
