/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Storyline, StorylineLayer, WithAlignedGroups, WithLayerDescriptions, WithRealizedGroups } from './Storyline';
import { matchString, pushMMap, unimplemented, windows2 } from './Utils';
import { fmtQP, QPConstraint, qpNum, QPTerm, qpVar, uniqueIds } from './QPSupport';
import highsLoader from 'highs';
import _ from 'lodash';

// TODO KILL THIS
import xxStory from "../static/story.json";
import xxMeta from "../static/meta.json";
import xxSol from "../static/sol.json";

const xStory = xxStory as Storyline<WithAlignedGroups, WithLayerDescriptions>;
const xMeta = xxMeta as {
  chars: {
    [index: string]: {
      "wagon-type": string,
      "start-station": string,
    }
  },
  meetings: {
    [index: string]: {
      "departure-station": string,
      "departure-time": string,
      "arrival-station": string,
      "arrival-time": string,
      "trip-number": string,
    }
  }
};
const xSol = xxSol as { [index: string]: number };
const FAKE_STORIES = false;
// TODO KILL THIS

export type AlignCriterion = "sum-of-heights" | "least-squares" | "strict-center" | "wiggle-count";

type InGroup = { groupId: string, offset: number };
type CharLines = Map<string, InGroup[]>;

export const align = async <S extends {}, L extends {}, G extends {}>(
  r: Storyline<WithRealizedGroups & G, L, S>,
  mode: AlignCriterion,
  gapRatio: number,
  alignContinuedMeetings: boolean,
): Promise<Storyline<WithAlignedGroups & G, L, S> | undefined> => {
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

  const cConstraints = alignContinuedMeetings ? continuedMeetings(r) : [];

  return matchString(mode, {
    "least-squares": () => solve(r, fmtQP([...yConstraints, ...cConstraints], optSqr(characters), 'min')),
    "sum-of-heights": () => {
      const [zConstraints, obj] = mkSumOfHeights(characters);
      return solve(r, fmtQP([...yConstraints, ...zConstraints, ...cConstraints], obj, 'min'));
    },
    "strict-center": () => alignCenter(r),
    "wiggle-count": () => {
      const m = bigM(r);
      const [zConstraints, obj] = mkWiggleCount(characters, m);
      const yVars = uniqueIds(yConstraints.map(c => c.left));
      const zVars = _.range(0, zConstraints.length / 2).map(i => `z${i}`);
      const bounds = yVars.map(id => ({ lb: 0, id, ub: m }));
      const yMax = qpVar("ymax")
      const yMConstraints = yVars.map(yv => yMax.greaterThanOrEqual(qpVar(yv)));
      const solution = fmtQP(
        [...yConstraints, ...zConstraints, ...cConstraints, ...yMConstraints],
        obj.plus(yMax.scale(1 / m)),
        'min',
        bounds,
        yVars,
        zVars
      );
      console.log(solution);
      return solve(r, "");
      // return fakeSolve(r, "");
    }
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

const continuedMeetings = (story: Storyline<WithRealizedGroups>) => {
  const lut = new Map<string, [string, number]>();  // char_id -> [group_id, group_size]
  const res: QPConstraint[] = [];
  story.layers.forEach((layer, i) => {
    layer.groups.forEach((group, j) => {
      if (group.kind === 'active') {
        const groupId = `l${i}g${j}`;
        let prevId: string | undefined = undefined;
        const groupSize = group.charactersOrdered.length;
        let continued = groupSize > 1;
        group.charactersOrdered.forEach(char => {
          const tmp = lut.get(char)
          if (tmp === undefined || tmp[1] !== groupSize) { continued = false; }
          else {
            prevId = tmp[0];
            continued = continued && (prevId == lut.get(char)?.[0]);
          }
          lut.set(char, [groupId, groupSize]);
        });
        if (continued) { res.push(qpVar(prevId!).equalTo(qpVar(groupId))); }
        // only for fake storylines!!
        else if (FAKE_STORIES && group.kind === 'active' && groupSize == 1) {
          const meetingId = `${xStory.layers[i]?.layerDescription}_${group.charactersOrdered[0]}`;
          const continued = xMeta.meetings[meetingId] === undefined;
          if (continued && prevId !== undefined) { res.push(qpVar(prevId!).equalTo(qpVar(groupId))); }
        }
        // end only for fake storylines
      }
    });
  });
  return res;
}

// todo: add proper error handling
const solve = async <S extends {}, L extends {}, G extends {}>(
  r: Storyline<WithRealizedGroups & S, L, G>,
  instance: string
): Promise<Storyline<WithAlignedGroups & S, L, G> | undefined> => {
  const highs = await highsLoader();
  // const highs = await highsLoader({ locateFile: file => `https://lovasoa.github.io/highs-js/${file}` });
  // const instance = fmtQP(yc, optSqr(cl), 'min');
  console.log(instance);
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

const fakeSolve = async <S extends {}, L extends {}, G extends {}>(
  r: Storyline<WithRealizedGroups & S, L, G>,
  instance: string
): Promise<Storyline<WithAlignedGroups & S, L, G> | undefined> =>
  Promise.resolve({
    ...r,
    layers: r.layers.map((layer, i) => ({
      ...layer,
      groups: layer.groups.map((group, j) => ({
        ...group,
        atY: xSol[`l${i}g${j}`]!,
      })),
    })),
  });

const alignCenter = async <S extends {}, L extends {}, G extends {}>(
  r: Storyline<WithRealizedGroups & S, L, G>
) => {
  const alignGroups = (layer: StorylineLayer<WithRealizedGroups & S> & L) => {
    const offset = layer.groups.reduce((s, g) => s + g.characters.length, 0) / 2;
    let rem = 0;
    return {
      ...layer,
      groups: layer.groups.map((group, j) => {
        const atY = rem - offset;
        rem += group.characters.length;
        return { ...group, atY };
      })
    }
  }
  return { ...r, layers: r.layers.map(alignGroups) };
}

const bigM = (story: Storyline) =>
  story.layers.flatMap(l => l.groups.map(g => g.characters.length)).reduce((a, b) => a + b)

const mkWiggleCount = (cl: CharLines, m: number): [QPConstraint[], QPTerm] => {
  const constraints = [...cl.values()
    .flatMap(line => windows2(line))
    .flatMap(([p, q], i) => {
      const a = qpVar(p.groupId).plus(qpNum(p.offset));
      const b = qpVar(q.groupId).plus(qpNum(q.offset));
      const z = qpVar(`z${i}`);
      return [a.lessThanOrEqual(b.plus(z.scale(m))), a.greaterThanOrEqual(b.minus(z.scale(m)))];
    })];
  const opt = _.range(0, constraints.length / 2).reduce((sum, i) => sum.plus(qpVar(`z${i}`)), qpNum(0));
  return [constraints, opt];
}
