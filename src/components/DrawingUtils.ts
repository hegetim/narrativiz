
export const sPathFrag = (dx: number, dy: number, blockSize: number, offset: number) => {
  console.info(`s-path frag: w=${dx} h=${dy} bs=${blockSize}@${offset} (=${offset * blockSize})`)
  const d = (dy * dy + dx * dx) / (2 * Math.abs(dy));
  const r1 = d / 2 - Math.sign(dy) * (offset - 0.5) * blockSize;
  const [dx1, dy1] = [r1 / d * dx, r1 / d * dy];
  console.info(`s-path frag: d=${d} r=${r1} dx=${dx1} dy=${dy1}`)
  const [r2, dx2, dy2] = [d - r1, dx - dx1, dy - dy1];
  return `a ${r1} ${r1} 0 0 ${+(dy1 > 0)} ${dx1} ${dy1} a ${r2} ${r2} 0 0 ${+(dy1 <= 0)} ${dx2} ${dy2}`;
}
