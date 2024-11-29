/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Storyline, WithAlignedGroups, WithRealizedGroups } from './Storyline';
import { matchString, pushMMap, windows2 } from './Utils';
import { fmtQP, QPConstraint, qpNum, QPTerm, qpVar } from './QPSupport';
import highsLoader from 'highs';
import _ from 'lodash';

export type AlignCriterion = "sum-of-heights" | "least-squares";

type InGroup = { groupId: string, offset: number };
type CharLines = Map<string, InGroup[]>;
type Realization = Storyline<WithRealizedGroups>;
type Aligned = Storyline<WithAlignedGroups>;

export const align = async (r: Realization, mode: AlignCriterion, gapRatio: number) => {
  const characters: CharLines = new Map();
  const yConstraints: QPConstraint[] = [];

  r.layers.forEach((layer, i) => {
    let prevGroup: { id: string, size: number } | undefined = undefined;
    layer.groups.forEach((group, j) => {
      if (group.charactersOrdered.length === 0) {
        throw new Error(`layer ${layer} has an empty group`);
      } else {
        const groupId = `l${i}g${j}`;
        group.charactersOrdered.forEach((cId, offset) => pushMMap(characters, cId, { groupId, offset }));
        if (prevGroup) {
          yConstraints.push(qpVar(prevGroup.id)
            .plus(qpNum(prevGroup.size - 1 + gapRatio))
            .lessThanOrEqual(qpVar(groupId))
          );
        }
        prevGroup = { id: groupId, size: group.charactersOrdered.length };
      }
    });
  });

  return matchString(mode, {
    "least-squares": () => solve(r, fmtQP(yConstraints, optSqr(characters), 'min')),
    "sum-of-heights": () => {
      const [zConstraints, obj] = mkSumOfHeights(characters);
      return solve(r, fmtQP(yConstraints.concat(...zConstraints), obj, 'min'));
    },
  });
}

const optSqr = (cl: CharLines) => cl.values()
  .flatMap(line => windows2(line).map(([p, q]) =>
    qpVar(p.groupId).plus(qpNum(p.offset)).minus(qpVar(q.groupId).plus(qpNum(q.offset))).squared()
  ))
  .reduce((a, b) => a.plus(b));

const mkSumOfHeights = (cl: CharLines): [QPConstraint[], QPTerm] => {
  const constraints = [...cl.values()
    .flatMap(line => windows2(line))
    .flatMap(([p, q], i) => {
      const a = qpVar(p.groupId).plus(qpNum(p.offset));
      const b = qpVar(q.groupId).plus(qpNum(q.offset));
      const z = qpVar(`z${i}`);
      return [a.minus(b).lessThanOrEqual(z), b.minus(a).lessThanOrEqual(z)];
    })];
  const opt = _.range(0, constraints.length / 2).reduce((sum, i) => sum.plus(qpVar(`z${i}`)), qpNum(0));
  return [constraints, opt];
}

// todo: add proper error handling
// todo: proper generic typing
const solve = async (r: Realization, instance: string): Promise<Aligned | undefined> => {
  const highs = await highsLoader();
  // const highs = await highsLoader({ locateFile: file => `https://lovasoa.github.io/highs-js/${file}` });
  // const instance = fmtQP(yc, optSqr(cl), 'min');
  // console.log(instance);
  const solution = highs.solve(instance);
  console.log(solution);
  if (solution.Status === 'Optimal') {
    return {
      ...r,
      layers: r.layers.map((layer, i) => ({
        ...layer,
        groups: layer.groups.map((group, j) => ({
          ...group,
          atY: solution.Columns[`l${i}g${j}`]?.Primal!,
        })),
      })),
    };
  } else return undefined;
}
