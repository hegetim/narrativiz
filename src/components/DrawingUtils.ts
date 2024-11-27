
export const sPathFrag = (width: number, height: number, blockSize: number, offset: number) => {
  const d = (height * height + width * width) / (2 * Math.abs(height));
  const r = d / 2 - (offset - 0.5) * blockSize;
  const [dx, dy] = [2 * r / d * width, 2 * r / d * height];
  const [r2, dx2, dy2] = [d / 2 - r, width - dx, height - dy];
  return `a ${r} ${r} 0 0 ${+(dy <= 0)} ${dx} ${dy} a ${r2} ${r2} 0 0 ${+(dy > 0)} ${dx2} ${dy2}`;
}
