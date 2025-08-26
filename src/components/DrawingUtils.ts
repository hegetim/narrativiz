/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { SLine } from "../model/Justify";

const eps = 1e-8;

export const blocks2SLine = (dx: number, dy: number, bs: number, offset: number): SLine => {
  const d = (dy * dy + dx * dx) / (2 * Math.abs(dy));
  const r1 = d / 2 - Math.sign(dy) * (offset - 0.5) * bs;
  return { dx, dy, r1, r2: d - r1 };
}

export const scaleSLine = ({ dx, dy, r1, r2 }: SLine, l: number) => ({ dx: dx * l, dy: dy * l, r1: r1 * l, r2: r2 * l });

export const sLine2svg = ({ dx, dy, r1, r2 }: SLine) => {
  if (dx < eps) { console.warn(`empty s-line: dx=${dx} dy=${dy} r1=${r1} r2=${r2}`); return ""; }
  if (Math.abs(dy) < eps) { return `h ${dx}`; }
  const [dx1, dy1] = [(r1 / (r1 + r2)) * dx, (r1 / (r1 + r2)) * dy];
  const [dx2, dy2] = [dx - dx1, dy - dy1];
  return `a ${r1} ${r1} 0 0 ${+(dy1 > 0)} ${dx1} ${dy1} a ${r2} ${r2} 0 0 ${+(dy1 <= 0)} ${dx2} ${dy2}`;
}
