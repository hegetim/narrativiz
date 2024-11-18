/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Storyline, WithAlignedGroups, WithRealizedGroups } from './Storyline';
import { pushMMap, windows2 } from './Utils';
import { fmtQP, QPConstraint, qpNum, qpVar } from './QPSupport';
import highsLoader from 'highs';
import { master2storyline, sgbFile } from '../io/sgb';

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

  return solve(r, characters, yConstraints);
}

const optSqr = (cl: CharLines) => cl.values()
  .flatMap(line => windows2(line).map(([p, q]) =>
    qpVar(p.groupId).plus(qpNum(p.offset)).minus(qpVar(q.groupId).plus(qpNum(q.offset))).squared()
  ))
  .reduce((a, b) => a.plus(b));

// todo: add proper error handling
const solve = async (r: Realization, cl: CharLines, yc: QPConstraint[]): Promise<Aligned | undefined> => {
  const highs = await highsLoader();
  const sol = highs.solve(fmtQP(yc, optSqr(cl), 'min'));
  if (sol.Status === 'Optimal') {
    return {
      ...r,
      layers: r.layers.map((layer, i) => ({
        ...layer,
        groups: layer.groups.map((group, j) => ({
          ...group,
          atY: sol.Columns[`l${i}g${j}`]?.Primal!,
        })),
      })),
    };
  } else return undefined;
}

const input = `*
AA a
BB b
CC c

1: AA,BB,CC: AA,BB,CC
2: CC,AA: CC,AA
3: CC,DD,AA: CC,DD,AA`;
export const sample: Realization = master2storyline(sgbFile('loose', 'master').tryParse(input));
