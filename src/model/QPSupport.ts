/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash"
import { matchByKind, unimplemented } from "./Utils"

interface QPMethods<F extends QPMethods<F>> {
  readonly plus: (other: QPTerm) => QPTerm
  readonly minus: (other: QPTerm) => QPTerm
  readonly negate: () => F
  readonly lessThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly greaterThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly equalTo: (other: QPTerm) => QPConstraint,
}

interface QPMethodsMulti {
  readonly times: (other: QPLinear) => QPQuadratic
  readonly squared: () => QPQuadratic
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
  plus: other => plus(linear(varIds, a, c), other),
  minus: other => plus(linear(varIds, a, c), other.negate()),
  negate: () => linear(varIds, a.map(x => -x), -c),
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
  lessThanOrEqual: other => constraint('<=', quadratic(varIds, m, lin), other),
  greaterThanOrEqual: other => constraint('<=', other, quadratic(varIds, m, lin)),
  equalTo: other => constraint('==', quadratic(varIds, m, lin), other),
})

const constraint = (kind: QPConstraint['kind'], left: QPTerm, right: QPTerm): QPConstraint =>
  ({ kind, left: left.minus(right), right: 0 });

const plus = (a: QPTerm, b: QPTerm): QPTerm => matchByKind(a, {
  linear: a => matchByKind(b, {
    linear: b => addLin(a, b),
    quadratic: b => ({ ...b, lin: addLin(b.lin, a) }),
  }),
  quadratic: a => matchByKind(b, {
    linear: b => ({ ...a, lin: addLin(a.lin, b) }),
    quadratic: b => addQuad(a, b),
  }),
});

const addLin = (a: QPLinear, b: QPLinear): QPLinear => {
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

const addQuad = (a: QPQuadratic, b: QPQuadratic): QPQuadratic => unimplemented();

const timesLin = (a: QPLinear, b: QPLinear): QPQuadratic => unimplemented();

export const unsupported = (op: string) => { throw new Error(`unsupported operation: ${op}`); }
