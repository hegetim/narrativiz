import _ from "lodash";
import { Storyline, WithAlignedGroups } from "./Storyline";
import { matchByKind } from "./Utils";

const groupSpacing = 10; // space between group members
const minRadius = 5;
const meetingWidth = 20;
const eps = 1e-6;

const justifyLayers = (s: Storyline<WithAlignedGroups>): DrawingFrag[] => {
  const state = new Map<string, { y: number, bs: number, offset: number }>();

  const stage3: Stage3[][] = s.layers.map((layer, layerId) => {
    const stage1: Stage1[] = layer.groups.flatMap(group =>
      group.charactersOrdered.map((char, i) => {
        const y = group.atY + i * groupSpacing;
        const y0 = state.get(char)?.y;
        return { char, y, dy: y0 === undefined ? NaN : y0 - y, inMeeting: group.kind === 'active' };
      })
    );

    let rem = { idx: 0, y: NaN, slope: 0 };
    const stage2: Stage2[] = [];
    for (let i of _.range(0, stage1.length + 1)) {
      const s1 = stage1[i];
      if (s1 !== undefined) {
        stage2.push({ ...s1, bs: 0, offset: 0, w: mkWidth(s1.dy, 0) + (s1.inMeeting ? meetingWidth : 0) });
      }
      if (rem.slope === 0 && s1 !== undefined) { rem = { idx: i, y: s1.y, slope: slope2slope(s1.dy) }; }
      else if (rem.slope !== slope2slope(s1?.dy ?? 0)) {
        const bsR = stage1[i - 1]!.y - rem.y;
        for (let j of _.range(rem.idx, i)) {
          const item = stage2[j]!
          const { y: _ignored, bs: bsL, offset: oL } = state.get(item.char)!;
          const oR = (j - rem.idx) / (i - 1);
          const [bs, offset] = joinBlocks(bsL, oL, bsR, oR);
          item.bs = bs;
          item.offset = offset;
          item.w = mkWidth(item.dy, bs) + (item.inMeeting ? meetingWidth : 0);
          state.set(item.char, { y: item.y, bs: bsR, offset: oR });
        }
        if (s1 !== undefined) { rem = { idx: i, y: s1.y, slope: slope2slope(s1.dy) }; }
      }
      if (s1 !== undefined && slope2slope(s1.dy) === 0) { state.set(s1.char, { y: s1.y, bs: 0, offset: 0 }); }
    }

    return _.concat<Stage3>(
      stage2.map(item => Number.isNaN(item.dy) ? { kind: 'initChar', ...item } : { kind: 'charLine', ...item }),
      s.layers.flatMap(l => l.groups.filter(g => g.kind === 'active'))
        .map(g => ({ kind: 'meeting', y: g.atY, h: (g.characters.length - 1) * groupSpacing, w: meetingWidth })),
    )
  });

  const layerWidth = Math.max(...stage3.flatMap(items => items.map(i => i.w)));
  return stage3.flatMap((items, layer) => items.map(item => matchByKind(item, {
    initChar: ic => ({
      kind: 'char-init',
      char: { id: ic.char, inMeeting: ic.inMeeting },
      pos: { x: (layer + 1) * layerWidth - meetingWidth, y: ic.y },
    }),
    charLine: cl => ({
      kind: 'char-line',
      char: { id: cl.char, inMeeting: cl.inMeeting },
      pos: { x: layer * layerWidth, y: cl.y },
      sLine: { dx: cl.inMeeting ? layerWidth - meetingWidth : layerWidth, dy: cl.dy, bs: cl.bs, offset: cl.offset },
    }),
    meeting: m => ({
      kind: 'meeting',
      pos: { x: (layer + 1) * layerWidth - meetingWidth, y: m.y },
      dx: meetingWidth,
    }),
  })));
}

const slope2slope = (x: number) => Math.abs(x) > eps ? Math.sign(x) : 0;

const mkWidth = (dy: number, bs: number) => {
  if (Number.isNaN(dy)) { return 0; }
  const dxMin2 = dy * (2 * bs + 4 * minRadius - dy); // block size conflict
  console.info(`dx_min²=${dxMin2} (block size conflict)`);
  return Math.max(dy, dxMin2 > 0 ? Math.sqrt(dxMin2) : 0);
}

const joinBlocks = (sizeL: number, offsetL: number, sizeR: number, offsetR: number) => {
  console.info(`join blocks: l=${sizeL} @ ${offsetL}  r=${sizeR} @ ${offsetR}`)
  if (sizeL === sizeR && sizeL === 0) return [0, 0] as const;
  const top = Math.max(sizeL * offsetL, sizeR * offsetR);
  const btm = Math.max(sizeL * (1 - offsetL), sizeR * (1 - offsetR));
  return [top + btm, top / (top + btm)] as const;
}

type Stage1 = { char: string, y: number, dy: number, inMeeting: boolean };
type Stage2 = Stage1 & { bs: number, offset: number, w: number };
type Stage3 = { kind: 'initChar' } & Omit<Stage2, 'dy'>
  | { kind: 'charLine' } & Stage2
  | { kind: 'meeting', y: number, w: number, h: number };

export type Pos = { x: number, y: number };
export type CharState = { id: string, inMeeting: boolean }
export type SLine = { dx: number, dy: number, bs: number, offset: number }

export type DrawingFrag = { kind: 'char-init', char: CharState, pos: Pos }
  | { kind: 'char-line', char: CharState, pos: Pos, sLine: SLine }
  | { kind: 'meeting', pos: Pos, dx: number }
