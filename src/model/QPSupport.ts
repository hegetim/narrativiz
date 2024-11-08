/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { unimplemented } from "./Utils"

interface QPMethods {
  readonly plus: (other: QPNum | QPVar | QPTerm) => QPTerm
  readonly minus: (other: QPNum | QPVar | QPTerm) => QPTerm
  readonly negate: () => QPTerm
  readonly times: (other: QPNum | QPVar | QPTerm) => QPTerm
  readonly squared: () => QPTerm
  readonly lessThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly greaterThanOrEqual: (other: QPTerm) => QPConstraint,
  readonly equalTo: (other: QPTerm) => QPConstraint,
}

type QPVar = { kind: 'var', id: string } & QPMethods;
type QPNum = { kind: 'num', value: number } & QPMethods;
type QPLinear = { kind: 'linear', varIds: string[], a: number[], c: number } & QPMethods
type QPQuadratic = { kind: 'quadratic', varIds: string[], m: number[][], lin: QPLinear } & QPMethods;

type QPTerm = QPVar | QPNum | QPLinear | QPQuadratic;

type QPConstraint = {
  kind: '<=' | '=='
  left: QPTerm
  right: number
}

// export const qpZero: QPZero = ({
//   kind: '0',
//   plus: other => other,
//   minus: other => other.negate(),
//   negate: () => qpZero,
//   squared: () => qpZero,
//   times: () => qpZero,
//   equalTo: other => ({ kind: '==', left: other, right: 0 }),
//   lessThanOrEqual: other => ({ kind: '<=', left: other.negate(), right: 0 }),
//   greaterThanOrEqual: other => ({ kind: '<=', left: other, right: 0 }),
// });

// export const qpOne: QPOne = ({
//   kind: '1',
//   plus: other => plus(qpOne, other),
//   minus: other => plus(qpOne, other.negate()),
//   negate: () => qpNum(-1),
//   squared: () => qpOne,
//   times: other => other,
//   equalTo: other => ({ kind: '==', left: other, right: 1 }),
//   lessThanOrEqual: other => ({ kind: '<=', left: other.negate(), right: -1 }),
//   greaterThanOrEqual: other => ({ kind: '<=', left: other, right: 1 }),
// })

export const qpNum = (value: number): QPNum => ({
  kind: 'num',
  value,
  plus: other => plus(qpNum(value), other),
  minus: other => plus(qpNum(value), other.negate()),
  negate: () => qpNum(-value),
  squared: () => qpNum(value * value),
  times: other => other.kind === 'num' ? qpNum(value * other.value) : other.times(qpNum(value)),
  equalTo: other => equalTo(qpNum(value), other),
  lessThanOrEqual: other => ({ kind: '<=', left: other.negate(), right: -value }),
  greaterThanOrEqual: other => ({ kind: '<=', left: other, right: value }),
});

export const qpVar = (id: string): QPVar => ({
  kind: 'var',
  id,
  plus: other => plus(qpVar(id), other),
  minus: other => plus(qpVar(id), other.negate()),
  negate: () => linear([id], [-1], 0),
  squared: () => quadratic([id], [[1]], linear([], [], 0)),
  times: other => times(qpVar(id), other),
  equalTo: other => equalTo(qpVar(id), other),
  lessThanOrEqual: other => lessThanOrEqual(qpVar(id), other),
  greaterThanOrEqual: other => lessThanOrEqual(other, qpVar(id)),
})

const plus = (a: QPTerm, b: QPTerm): QPTerm => unimplemented();
// other.kind === 'num' ? qpNum(value + other.value) : other.plus(qpNum(value))

const times = (a: QPTerm, b: QPTerm): QPTerm => unimplemented();

const linear = (varIds: string[], a: number[], c: number): QPLinear => unimplemented();

const quadratic = (varIds: string[], m: number[][], lin: QPLinear): QPQuadratic => unimplemented();

const equalTo = (left: QPTerm, right: QPTerm): QPConstraint => unimplemented();

const lessThanOrEqual = (left: QPTerm, right: QPTerm): QPConstraint => unimplemented();
