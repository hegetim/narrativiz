import _ from "lodash";
import { Storyline, WithAlignedGroups } from "./Storyline";

const groupSpacing = 10; // space between group members
const minRadius = 5;
const meetingWidth = 20;
const eps = 1e-6;

const justifyLayers = (s: Storyline<WithAlignedGroups>) => {
  const state = new Map<string, { y: number, bs: number, offset: number }>();
  const result: DrawingFrag[] = [];

  s.layers.forEach((layer, layerId) => {
    const stage1: Stage1[] = layer.groups.flatMap(group =>
      group.charactersOrdered.map((char, i) => {
        const y = group.atY + i * groupSpacing;
        const y0 = state.get(char)?.y;
        return { char, y, dy: y0 === undefined ? NaN : y0 - y };
      })
    );

    let rem = { idx: 0, y: NaN, slope: 0 };
    const stage2: Stage2[] = [];
    for (let i of _.range(0, stage1.length + 1)) {
      const s1 = stage1[i];
      if (s1 !== undefined) { stage2.push({ ...s1, bs: 0, offset: 0, w: mkWidth(s1.dy, 0) }); }
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
          item.w = mkWidth(item.dy, bs);  // todo add space for meeting
          state.set(item.char, { y: item.y, bs: bsR, offset: oR });
        }
        if (s1 !== undefined) { rem = { idx: i, y: s1.y, slope: slope2slope(s1.dy) }; }
      }
      if (s1 !== undefined && slope2slope(s1.dy) === 0) { state.set(s1.char, { y: s1.y, bs: 0, offset: 0 }); }
    }

    // todo create frags...
    for (let item of stage2) {
      if (Number.isNaN(item.dy)) { result.push({ kind: 'initChar', ...item }); }
      else { result.push({ kind: 'charLine', ...item }); }
    }
    for (let group of s.layers.flatMap(l => l.groups)) {
      if (group.kind === 'active') {
        result.push({ kind: 'meeting', y: group.atY, h: (group.characters.length - 1) * groupSpacing, w: meetingWidth });
      }
    }
    // todo layer switch frag
  });
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

type Stage1 = { char: string, y: number, dy: number };
type Stage2 = Stage1 & { bs: number, offset: number, w: number };

export type DrawingFrag = { kind: 'initChar' } & Omit<Stage2, 'dy'>
  | { kind: 'charLine' } & Stage2
  | { kind: 'meeting', y: number, w: number, h: number }
  | { kind: 'switchLayers', nextLayer: number };
