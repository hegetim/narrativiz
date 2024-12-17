import { SLine } from "../model/Justify";

export const sPathFrag = ({ dx, dy, bs, offset }: SLine) => {
  if (dx === 0) { console.warn(`empty s-line: dx=${dx} dy=${dy} bs=${bs} offset=${offset}`); return ""; }
  if (dy === 0) { return `h ${dx}`; }
  console.info(`s-path frag: w=${dx} h=${dy} bs=${bs}@${offset} (=${offset * bs})`)
  const d = (dy * dy + dx * dx) / (2 * Math.abs(dy));
  const r1 = d / 2 - Math.sign(dy) * (offset - 0.5) * bs;
  const [dx1, dy1] = [r1 / d * dx, r1 / d * dy];
  console.info(`s-path frag: d=${d} r=${r1} dx=${dx1} dy=${dy1}`)
  const [r2, dx2, dy2] = [d - r1, dx - dx1, dy - dy1];
  return `a ${r1} ${r1} 0 0 ${+(dy1 > 0)} ${dx1} ${dy1} a ${r2} ${r2} 0 0 ${+(dy1 <= 0)} ${dx2} ${dy2}`;
}
