import _, { invokeMap } from "lodash";
import { Storyline, WithAlignedGroups } from "./Storyline";
import { ifDefined, matchByKind, windows2 } from "./Utils";

// const groupSpacing = 20; // space between group members
const minRadius = 1;
const meetingWidth = 1;
const eps = 1e-6;


export const justifyLayers = (s: Storyline<WithAlignedGroups>): DrawingFrag[] => {
  const layers: Stage1A[][] = s.layers.map(layer =>
    layer.groups.flatMap(group =>
      group.charactersOrdered.map((char, j) => ({ char, inMeeting: group.kind === 'active', y: group.atY + j }))
    )
  );

  const betweenLayers: Stage1B[][] = [...windows2(layers)].map(([left, right]) => right.map(r => {
    const l = _.find(left, x => x.char === r.char);
    return { char: r.char, inMeeting: r.inMeeting, yl: l?.y, yr: r.y };
  }));

  const firstLayer: Stage2A[] = layers[0]!.map(x => ({ ...x, kind: 'char-init' }));

  const otherLayers: Stage2A[][] = _.zip(_.initial(layers), betweenLayers).map(([left, right]) => {
    if (!left || !right) { throw new Error(`layer undefined: l=${left} r=${right}`) } else {
      const leftBlocks = mkBlocks(
        left,
        l => slope2slope(ifDefined(right.find(r => l.char === r.char), dy) ?? NaN),
        l => l.y
      );
      const rightBlocks = mkBlocks(right, r => slope2slope(dy(r)), r => r.yr);

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

  const layerWidth = Math.max(...otherLayers.flatMap(layer => layer.map<number>(item => matchByKind(item, {
    "char-init": _0 => meetingWidth,
    "char-line": cl => mkWidth(cl.dy, cl.bs) + (cl.inMeeting ? meetingWidth : 0),
  }))));

  return [
    ...[firstLayer, ...otherLayers].flatMap((layer, i) => layer.map<DrawingFrag>(item => matchByKind(item, {
      "char-init": ci => ({
        kind: "char-init",
        char: { id: ci.char, inMeeting: ci.inMeeting },
        pos: { x: (i + 1) * layerWidth - meetingWidth, y: ci.y },
        dx: meetingWidth,
      }),
      "char-line": cl => ({
        kind: "char-line",
        char: { id: cl.char, inMeeting: cl.inMeeting },
        pos: { x: i * layerWidth, y: cl.y },
        // sLine: { dx: cl.inMeeting ? layerWidth - meetingWidth : layerWidth, dy: cl.dy, bs: cl.bs, offset: cl.offset },
        sLine: { dx: layerWidth - meetingWidth, dy: cl.dy, bs: cl.bs, offset: cl.offset },
        dx: layerWidth,
      }),
    }))),
    ...s.layers.flatMap((layer, i) => layer.groups.filter(g => g.kind === 'active').map(g => ({
      kind: "meeting" as const,
      pos: { x: (i + 1) * layerWidth - meetingWidth, y: g.atY },
      dx: meetingWidth,
      dy: g.characters.length - 1,
    }))),
  ];
}

const slope2slope = (x: number): -1 | 0 | 1 => Math.abs(x) > eps ? (x > 0 ? 1 : -1) : 0;

const dy = (s: Stage1B) => s.yl === undefined ? NaN : s.yr - s.yl

const mkWidth = (dy: number, bs: number) => {
  if (Number.isNaN(dy)) { return 0; }
  const dxMin2 = (2 * bs + 4 * minRadius) * Math.abs(dy) - dy * dy; // block size conflict
  console.info(`dx_min²=${dxMin2} dy=${dy} bs=${bs}`);
  return Math.max(Math.abs(dy), dxMin2 > 0 ? Math.sqrt(dxMin2) : 0);
}

const joinBlocks = (sizeL: number, offsetL: number, sizeR: number, offsetR: number) => {
  console.info(`join blocks: l=${sizeL} @ ${offsetL}  r=${sizeR} @ ${offsetR}`)
  if (sizeL === sizeR && sizeL === 0) return [0, 0] as const;
  const top = Math.max(sizeL * offsetL, sizeR * offsetR);
  const btm = Math.max(sizeL * (1 - offsetL), sizeR * (1 - offsetR));
  return [top + btm, top / (top + btm)] as const;
}

const mkBlocks = <T extends {}>(
  ts: T[],
  slope: (t: T) => -1 | 0 | 1,
  y: (t: T) => number,
): (T & { bs: number, offset: number })[] => {
  const rem: (T & { slope?: -1 | 0 | 1 | undefined })[] = [...ts];
  const res: (T & { bs: number, offset: number })[] = [];
  let i = 0, j = 0;
  while (i <= ts.length) {
    const itemI = rem[i];
    if (itemI !== undefined) { itemI.slope = slope(itemI); }
    if (itemI?.slope !== rem[j]!.slope) {
      const y0 = y(rem[j]!)
      const bs = y(rem[i - 1]!) - y0;
      while (j !== i) {
        res.push({ ...ts[j]!, bs: bs, offset: bs === 0 ? 0 : (y(rem[j]!) - y0) / bs });
        j++;
      }
    }
    i++;
  }
  return res;
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
export type SLine = { dx: number, dy: number, bs: number, offset: number }

export type DrawingFrag = { kind: 'char-init', char: CharState, pos: Pos, dx: number }
  | { kind: 'char-line', char: CharState, pos: Pos, sLine: SLine, dx: number }
  | { kind: 'meeting', pos: Pos, dx: number, dy: number }

