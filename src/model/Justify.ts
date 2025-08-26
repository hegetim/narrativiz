/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Storyline, WithAlignedGroups } from "./Storyline";
import { assertNever, assertThat, ifDefined, matchByKind, matchString, windows2 } from "./Utils";
import { blocks2SLine } from "../components/DrawingUtils";

const minRadius = 1;
const meetingWidth = 0.5;
const minLayerWidth = 0.8;
const eps = 1e-6;

export type JustifyConfig = {
  layerStyle: 'uniform' | 'condensed',
  blockHandling: 'full' | 'continuous'
}

export const justifyLayers = (s: Storyline<WithAlignedGroups>, { layerStyle, blockHandling }: JustifyConfig): DrawingFrag[] => {
  const layers: Stage1A[][] = s.layers.map(layer =>
    layer.groups.flatMap(group =>
      group.charactersOrdered.map((char, j) => ({ char, inMeeting: group.kind === 'active', y: group.atY + j }))
    )
  );

  const betweenLayers: Stage1B[][] = [...windows2(layers)].map(([left, right]) => right.map(r => {
    const l = left.find(x => x.char === r.char);
    return { char: r.char, inMeeting: r.inMeeting, yl: l?.y, yr: r.y };
  }));

  const firstLayer: Stage2A[] = layers[0]!.map(x => ({ ...x, kind: 'char-init' }));

  const otherLayers: Stage2A[][] = _.zip(_.initial(layers), betweenLayers).map(([left, right]) => {
    if (!left || !right) { throw new Error(`layer undefined: l=${left} r=${right}`) } else {
      const leftSlope = (l: Stage1A) => slope2slope(ifDefined(right.find(r => l.char === r.char), dy) ?? NaN);
      const leftBlocks = mkBlocks(blockHandling, left, leftSlope, l => l.y);
      const rightBlocks = mkBlocks(blockHandling, right, r => slope2slope(dy(r)), r => r.yr);

      return rightBlocks.map(r => {
        if (r.yl === undefined) { return { kind: 'char-init', char: r.char, y: r.yr, inMeeting: r.inMeeting }; }
        else {
          const l = leftBlocks.find(x => x.char === r.char)!;
          const [bs, offset] = joinBlocks(l.bs, l.offset, r.bs, r.offset);
          return { kind: 'char-line', char: r.char, inMeeting: r.inMeeting, y: r.yl, dy: r.yr - r.yl, bs, offset };
        }
      });
    }
  })

  if (layerStyle === 'uniform') {
    const layerWidth = Math.max(...otherLayers.flatMap(mkWidth));
    return mkFragsUniform(s, [firstLayer, ...otherLayers], layerWidth);
  } else if (layerStyle === 'condensed') {
    return mkFragsCondensed(s, [firstLayer, ...otherLayers]);
  } else { return assertNever(layerStyle); }
}

const slope2slope = (x: number): -1 | 0 | 1 => Math.abs(x) > eps ? (x > 0 ? 1 : -1) : 0;

const dy = (s: Stage1B) => s.yl === undefined ? NaN : s.yr - s.yl


const mkWidth = (layer: Stage2A[]) => layer.map<number>(item => matchByKind(item, {
  "char-init": _0 => meetingWidth,
  "char-line": cl => {
    if (Number.isNaN(cl.dy)) { return 0; }
    const dxMin2 = (2 * cl.bs + 4 * minRadius) * Math.abs(cl.dy) - cl.dy * cl.dy; // block size conflict
    return Math.max(Math.abs(cl.dy), dxMin2 > 0 ? Math.sqrt(dxMin2) : 0) + meetingWidth;
  }
}));

const joinBlocks = (sizeL: number, offsetL: number, sizeR: number, offsetR: number) => {
  // console.info(`join blocks: l=${sizeL} @ ${offsetL}  r=${sizeR} @ ${offsetR}`)
  if (sizeL === sizeR && sizeL === 0) return [0, 0] as const;
  const top = Math.max(sizeL * offsetL, sizeR * offsetR);
  const btm = Math.max(sizeL * (1 - offsetL), sizeR * (1 - offsetR));
  return [top + btm, top / (top + btm)] as const;
}

const mkBlocks = <T extends {}>(
  mode: JustifyConfig['blockHandling'],
  ts: T[],
  slope: (t: T) => -1 | 0 | 1,
  y: (t: T) => number,
): (T & { bs: number, offset: number })[] => {
  const rem: (T & { slope?: -1 | 0 | 1 | undefined })[] = [...ts];
  const res: (T & { bs: number, offset: number })[] = [];
  rem.forEach(t => t.slope = slope(t));

  matchString(mode, {
    continuous: () => {
      let i = 0, j = 0;
      while (i <= ts.length) {
        const itemI = rem[i];
        // if (itemI !== undefined) { itemI.slope = slope(itemI); }
        if (itemI?.slope !== rem[j]!.slope) {
          const y0 = y(rem[j]!)
          const bs = y(rem[i - 1]!) - y0;
          while (j !== i) {
            res.push({ ...ts[j]!, bs, offset: bs === 0 ? 0 : (y(rem[j]!) - y0) / bs });
            j++;
          }
        }
        i++;
      }
    },
    full: () => {
      let [firstUp, firstDown, lastUp, lastDown] = [-1, -1, -1, -1];
      rem.forEach((t, i) => {
        if (t.slope === -1) {
          if (firstUp === -1) { firstUp = i; }
          lastUp = i;
        }
        if (t.slope === 1) {
          if (firstDown === -1) { firstDown = i; }
          lastDown = i;
        }
      });
      const [up0, down0] = [ifDefined(rem[firstUp], y) ?? 0, ifDefined(rem[firstDown], y) ?? 0];
      const [upBs, downBs] = [(ifDefined(rem[lastUp], y) ?? 0) - up0, (ifDefined(rem[lastDown], y) ?? 0) - down0];
      console.log({ firstUp, firstDown, lastUp, lastDown, up0, down0, upBs, downBs })
      rem.forEach(t => {
        if (t.slope === -1) {
          res.push({ ...t, bs: upBs, offset: upBs === 0 ? 0 : (y(t) - up0) / upBs });
        } else if (t.slope === 1) {
          res.push({ ...t, bs: downBs, offset: downBs === 0 ? 0 : (y(t) - down0) / downBs });
        } else {
          res.push({ ...t, bs: 0, offset: 0 });
        }
      });
    }
  });

  return res;
}

const mkFragsUniform = (story: Storyline<WithAlignedGroups>, layers: Stage2A[][], width: number): DrawingFrag[] => [
  ...layers.flatMap((layer, i) => layer.map<DrawingFrag>(item => matchByKind(item, {
    "char-init": ci => ({
      kind: "char-init",
      char: { id: ci.char, inMeeting: ci.inMeeting },
      pos: { x: (i + 1) * width - meetingWidth, y: ci.y },
      dx: meetingWidth,
    }),
    "char-line": cl => ({
      kind: "char-line",
      char: { id: cl.char, inMeeting: cl.inMeeting },
      pos: { x: i * width, y: cl.y },
      sLine: blocks2SLine(width - meetingWidth, cl.dy, cl.bs, cl.offset),
      dx: width,
    }),
  }))),
  ...story.layers.flatMap((layer, i) => layer.groups.filter(g => g.kind === 'active').map(g => ({
    kind: "meeting" as const,
    pos: { x: (i + 1) * width - meetingWidth, y: g.atY },
    dx: meetingWidth,
    dy: g.characters.length - 1,
    layer: i,
    topChar: g.charactersOrdered[0]!,
  }))),
];

const mkFragsCondensed = (story: Storyline<WithAlignedGroups>, layers: Stage2A[][]) => {
  assertThat(story.layers.length === layers.length, "number of storyline layers and calculated layers did not match");
  const result: DrawingFrag[] = [];
  let x = 0;
  _.zip(story.layers, layers).forEach(([sl, s2a], i) => {
    const width = Math.max(...mkWidth(s2a!), minLayerWidth);
    result.push(...s2a!.map<DrawingFrag>(item => matchByKind(item, {
      "char-init": ci => ({
        kind: "char-init",
        char: { id: ci.char, inMeeting: ci.inMeeting },
        pos: { x: x + width - meetingWidth, y: ci.y },
        dx: meetingWidth,
      }),
      "char-line": cl => ({
        kind: "char-line",
        char: { id: cl.char, inMeeting: cl.inMeeting },
        pos: { x, y: cl.y },
        sLine: blocks2SLine(width - meetingWidth, cl.dy, cl.bs, cl.offset),
        dx: width,
      }),
    })));
    result.push(...sl!.groups.filter(g => g.kind === 'active').map(g => ({
      kind: "meeting" as const,
      pos: { x: x + width - meetingWidth, y: g.atY },
      dx: meetingWidth,
      dy: g.characters.length - 1,
      layer: i,
      topChar: g.charactersOrdered[0]!,
    })));
    x += width;
  });
  return result;
}

export const corners = (frag: DrawingFrag): (readonly [number, number])[] => matchByKind(frag, {
  "char-init": ci => [[ci.pos.x, ci.pos.y], [ci.pos.x + ci.dx, ci.pos.y]],
  "char-line": cl => [
    [cl.pos.x, cl.pos.y],
    [cl.pos.x + cl.dx, cl.pos.y],
    [cl.pos.x, cl.pos.y + cl.sLine.dy],
    [cl.pos.x + cl.dx, cl.pos.y + cl.sLine.dy]
  ],
  meeting: m => [
    [m.pos.x, m.pos.y],
    [m.pos.x + m.dx, m.pos.y],
    [m.pos.x, m.pos.y + m.dy],
    [m.pos.x + m.dx, m.pos.y + m.dy],
  ],
})

type Stage1A = { char: string, y: number, inMeeting: boolean };
type Stage1B = Omit<Stage1A, 'y'> & { yl: number | undefined, yr: number };
type Stage2A = Stage1A & ({ kind: 'char-init' } | { kind: 'char-line', dy: number, bs: number, offset: number })

export type Pos = { x: number, y: number };
export type CharState = { id: string, inMeeting: boolean }
export type SLine = { dx: number, dy: number, r1: number, r2: number }

export type DrawingFrag = { kind: 'char-init', char: CharState, pos: Pos, dx: number }
  | { kind: 'char-line', char: CharState, pos: Pos, sLine: SLine, dx: number }
  | { kind: 'meeting', pos: Pos, dx: number, dy: number, layer: number, topChar: string }

