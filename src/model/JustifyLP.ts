/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Storyline, StorylineLayer, WithAlignedGroups } from "./Storyline";
import { DrawingFrag, JustifyConfig, SLine } from "./Justify";
import { Bound, fmtQP, QPConstraint, qpNum, QPTerm, qpVar } from "./QPSupport";
import highsLoader, { Highs, HighsSolution } from "highs";
import { ifDefined, matchString, windows2 } from "./Utils";

type ItemState = {
  char: string,
  yl: number | undefined,
  yr: number | undefined,
  leftGap: readonly [number, string] | undefined,
  rightGap: readonly [number, string] | undefined,
};

type PreparedLayer = {
  original: StorylineLayer<WithAlignedGroups>,
  items: Map<string, ItemState>,
  dx: number,
  sLines: Map<string, SLine>,
}

const eps = 1e-6;
const minRadius = 1;
const meetingWidth = 0.5;
const minLayerWidth = 0.8;

export const justifyLayers = async (
  s: Storyline<WithAlignedGroups>,
  layerStyle: JustifyConfig['layerStyle']
): Promise<DrawingFrag[]> => {
  const highs = await highsLoader();
  const layers = [
    ...windows2<StorylineLayer<WithAlignedGroups>>([{ groups: [] }, ...s.layers])
      .map(([l, r]) => justifyLayer(l, r, highs))
  ];
  const [result, _0] = matchString(layerStyle, {
    condensed: () => layers.reduce<readonly [DrawingFrag[], number]>(([acc, x], layer, i) => {
      acc.push(...mkLayerFrags(x, layer.dx, layer.original, i, layer.items, layer.sLines));
      return [acc, x + layer.dx];
    }, [[], 0]),
    uniform: () => {
      const width = Math.max(...layers.map(pl => pl.dx));
      return layers.reduce<readonly [DrawingFrag[], number]>(([acc, x], layer, i) => {
        acc.push(...mkLayerFrags(x, width, layer.original, i, layer.items, layer.sLines));
        return [acc, x + Math.max(width, layer.dx)];
      }, [[], 0]);
    }
  });
  return result;
}

const initState = (char: string): ItemState => ({
  char,
  yl: undefined,
  yr: undefined,
  leftGap: undefined,
  rightGap: undefined,
});

const justifyLayer = (
  l: StorylineLayer<WithAlignedGroups>,
  r: StorylineLayer<WithAlignedGroups>,
  highs: Highs,
): PreparedLayer => {
  const items = makeItems(l, r);
  const boring = boringLayer(items);
  if (boring) { return { original: r, items, dx: boring[0], sLines: boring[1] }; }

  const solution = highs.solve(makeLayerLP(items));
  const res = prepareLayer(items, solution);
  if (res) { return { original: r, items, dx: res[0], sLines: res[1] }; }

  console.error(solution);
  throw new Error(solution.Status);
}

const makeItems = (l: StorylineLayer<WithAlignedGroups>, r: StorylineLayer<WithAlignedGroups>) => {
  const chars = new Map<string, ItemState>(
    [...l.groups.flatMap(g => g.characters), ...r.groups.flatMap(g => g.characters)]
      .map(key => [key, initState(key)] as const)
  );
  l.groups.forEach(g => g.charactersOrdered.forEach((c, i) => chars.get(c)!.yl = g.atY + i));
  r.groups.forEach(g => g.charactersOrdered.forEach((c, i) => chars.get(c)!.yr = g.atY + i));
  const [cl, cr] = [l.groups.flatMap(g => g.charactersOrdered), r.groups.flatMap(g => g.charactersOrdered)];
  cl.forEach((a, i) => {
    ifDefined(checkItem(chars.get(a)), ([charA, yla, yra]) => {
      if (yla > yra) { // upward
        let stop = false;
        for (let j = i + 1; !stop && j < cl.length; j++) {
          ifDefined(checkItem(chars.get(cl[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.leftGap = [ylb - yla, charB.char];
              stop = true;
            }
          });
        }
      }
      if (yla < yra) { // downward
        let stop = false;
        for (let j = i - 1; !stop && j >= 0; j--) {
          ifDefined(checkItem(chars.get(cl[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.leftGap = [yla - ylb, charB.char];
              stop = true;
            }
          });
        }
      }
    });
  });
  cr.forEach((a, i) => {
    ifDefined(checkItem(chars.get(a)), ([charA, yla, yra]) => {
      if (yla > yra) { // upward
        let stop = false;
        for (let j = i - 1; !stop && j >= 0; j--) {
          ifDefined(checkItem(chars.get(cr[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.rightGap = [yra - yrb, charB.char];
              stop = true;
            }
          });
        }
      }
      if (yla < yra) { // downward
        let stop = false;
        for (let j = i + 1; !stop && j < cl.length; j++) {
          ifDefined(checkItem(chars.get(cr[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.rightGap = [yrb - yra, charB.char];
              stop = true;
            }
          });
        }
      }
    });
  });
  // check for narrowing or widening gaps
  cl.forEach(a => {
    const charA = chars.get(a)!;
    ifDefined(charA.leftGap, ([sizeL, b]) => {
      const charB = chars.get(b)!;
      ifDefined(charB.rightGap, ([sizeR, maybeA]) => {
        if (a === maybeA) {
          if (sizeL > sizeR) { charA.leftGap = undefined; }
          if (sizeL < sizeR) { charB.rightGap = undefined; }
        }
      });
    });
  });
  return chars;
}

const checkItem = (item: ItemState | undefined) =>
  item && item.yl !== undefined && item.yr !== undefined && Math.abs(item.yl - item.yr) > eps
    ? [item, item.yl, item.yr] as const
    : undefined;

const checkPair = (yla: number, yra: number, ylb: number, yrb: number) =>
  (yla < ylb) === (yra < yrb) // non-crossing
  && Math.min(yla, yra) <= Math.max(ylb, yrb) + eps && Math.max(yla, yra) + eps >= Math.min(ylb, yrb) // related
  && (yla < yra) === (ylb < yrb); // co-oriented

const dy = (it: ItemState) => it.yl === undefined || it.yr === undefined ? 0 : it.yr - it.yl;

const makeLayerLP = (items: Map<string, ItemState>) => {
  const constraints: QPConstraint[] = [];
  const bounds: Bound[] = [];
  const zVars: QPTerm[] = [];

  // (XM)
  const dy2 = Math.max(...items.values().map(it => dy(it) * dy(it)), minLayerWidth * minLayerWidth);
  const dx2 = qpVar("dx2");
  constraints.push(dx2.greaterThanOrEqual(qpNum(dy2)));

  items.values().forEach(item => {
    // (R1)
    const dyi = Math.abs(dy(item));
    if (dyi >= eps) {
      const [ra, rb] = [qpVar(`r${item.char}a`), qpVar(`r${item.char}b`)];
      constraints.push(dx2.equalTo(ra.plus(rb).scale(2 * dyi).minus(qpNum(dyi * dyi))));
      // (Z)
      const zi = qpVar(`z${item.char}`);
      constraints.push(ra.minus(rb).lessThanOrEqual(zi));
      constraints.push(rb.minus(ra).lessThanOrEqual(zi));
      zVars.push(zi);
      // Bounds
      bounds.push({ id: `r${item.char}a`, lb: minRadius, ub: Infinity });
      bounds.push({ id: `r${item.char}b`, lb: minRadius, ub: Infinity });
    }

    // (D1-D4)
    ifDefined(item.leftGap, ([gap, other]) => {
      constraints.push(qpVar(`r${item.char}a`).lessThanOrEqual(qpVar(`r${other}a`).minus(qpNum(gap))));
    });
    ifDefined(item.rightGap, ([gap, other]) => {
      constraints.push(qpVar(`r${item.char}b`).lessThanOrEqual(qpVar(`r${other}b`).minus(qpNum(gap))));
    });
  });

  if (zVars.length === 0) { console.error({ msg: "no z-vars instance", items: [...items.entries()] }); }
  const objective = dx2.plus(zVars.reduce((a, b) => a.plus(b)).scale(0.5));

  return fmtQP(constraints, objective, "min", bounds);
}

const boringLayer = (items: Map<string, ItemState>): undefined | readonly [number, Map<string, SLine>] => {
  for (let item of items.values()) {
    if (item.yl === undefined && item.yr === undefined) { throw new Error(`broken item: ${item}`); }
    if (item.yl !== undefined && item.yr !== undefined && Math.abs(dy(item)) > 0) { return undefined; }
  }
  return [minLayerWidth, new Map()];
}

const prepareLayer = (items: Map<string, ItemState>, solution: HighsSolution) => {
  if (solution.Status !== 'Optimal') { return undefined; }

  const result: Map<string, SLine> = new Map();
  const dx = Math.sqrt(solution.Columns['dx2']?.Primal!)

  items.values().forEach(item => {
    const dyi = dy(item);
    if (Math.abs(dyi) >= eps) {
      const r = { r1: solution.Columns[`r${item.char}a`]?.Primal!, r2: solution.Columns[`r${item.char}b`]?.Primal! };
      result.set(item.char, { dx, dy: dyi, ...r });
    }
  });

  return [dx, result] as const;
}

const mkLayerFrags = (
  x: number,
  dx: number,
  layer: StorylineLayer<WithAlignedGroups>,
  layerId: number,
  items: Map<string, ItemState>,
  sLines: Map<string, SLine>
) => {
  const result: DrawingFrag[] = [];
  layer.groups.forEach(group => {
    group.charactersOrdered.forEach(char => {
      const item = items.get(char)!;
      const sLine = sLines.get(char);
      if (item.yl === undefined) {
        result.push({
          kind: 'char-init',
          char: { id: char, inMeeting: group.kind === 'active' },
          pos: { x: x + dx - meetingWidth, y: item.yr! },
          dx: meetingWidth,
        });
      } else {
        result.push({
          kind: 'char-line',
          char: { id: char, inMeeting: group.kind === 'active' },
          pos: { x, y: item.yl },
          sLine: sLine ? sLine : { dx, dy: 0, r1: 0, r2: 0 },
          dx,
        });
      }
    });
  });
  result.push(...layer.groups.filter(g => g.kind === 'active').map<DrawingFrag>(g => ({
    kind: 'meeting',
    pos: { x: x + dx - meetingWidth, y: g.atY },
    dx: meetingWidth,
    dy: g.characters.length - 1,
    layer: layerId,
    topChar: g.charactersOrdered[0]!,
  })));
  return result;
}
