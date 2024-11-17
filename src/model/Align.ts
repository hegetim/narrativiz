/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { StorylineRealization } from './Storyline';
import { pushMMap, windows2 } from './Utils';
import { fmtQP, QPConstraint, qpNum, qpVar } from './QPSupport';
import highsLoader from 'highs';

export type AlignCriterion = "sum-of-heights" | "least-squares";

const highs = highsLoader();

type InGroup = { groupId: string, offset: number };

type CharLines = Map<string, InGroup[]>

export const align = (r: StorylineRealization, mode: AlignCriterion, gapRatio: number) => {
  const characters: CharLines = new Map();
  const yConstraints: QPConstraint[] = [];

  r.layers.forEach((layer, i) => {
    let prevGroup: { id: string, size: number } | undefined = undefined;
    layer.groups.forEach((group, j) => {
      if (group.ordered.length === 0) {
        throw new Error(`layer ${layer} has an empty group`);
      } else {
        const groupId = `l${i}g${j}`;
        group.ordered.forEach((cId, offset) => pushMMap(characters, cId, { groupId, offset }));
        if (prevGroup) {
          yConstraints.push(qpVar(prevGroup.id)
            .plus(qpNum(prevGroup.size - 1 + gapRatio))
            .lessThanOrEqual(qpVar(groupId))
          );
        }
        prevGroup = { id: groupId, size: group.ordered.length };
      }
    });
  })

  return fmtQP(yConstraints, optSqr(characters), 'min');
}

const optSqr = (cl: CharLines) => cl.values()
  .flatMap(line => windows2(line).map(([p, q]) =>
    qpVar(p.groupId).plus(qpNum(p.offset)).minus(qpVar(q.groupId).plus(qpNum(q.offset))).squared()
  ))
  .reduce((a, b) => a.plus(b));

export const sample: StorylineRealization = ({
  layers: [
    { groups: [{ type: 'active', ordered: ['a', 'b', 'c'] }] },
    { groups: [{ type: 'active', ordered: ['c', 'a'] }] },
    { groups: [{ type: 'active', ordered: ['c', 'd', 'a'] }] },
  ]
})

