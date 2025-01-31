/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { matchByKind, pushMMap } from "../model/Utils";
import { corners, DrawingFrag, justifyLayers, SLine } from "../model/Justify";
import { Storyline, WithAlignedGroups } from "../model/Storyline";
import { sPathFrag } from "./DrawingUtils";

const oneDistance = 20;

type Props = {
  story: Storyline<WithAlignedGroups>
};

export const StorylineComponent = ({ story }: Props) => {

  const justified = justifyLayers(story, { layerStyle: 'condensed' });
  const [width, _height, vbox] = bbox(justified.flatMap(corners), oneDistance);
  return <svg viewBox={vbox} width={width}>{drawFrags(justified)}</svg>;
}

const bbox = (pts: (readonly [number, number])[], s: number = 1) => {
  const xmin = Math.min(...pts.map(p => p[0]));
  const ymin = Math.min(...pts.map(p => p[1]));
  const xmax = Math.max(...pts.map(p => p[0]));
  const ymax = Math.max(...pts.map(p => p[1]));
  return [
    (xmax - xmin) * s,
    (ymax - ymin) * s,
    `${xmin * s - 10} ${ymin * s - 10} ${(xmax - xmin) * s + 20} ${(ymax - ymin) * s + 20}`
  ] as const;
}

const drawFrags = (frags: DrawingFrag[]) => {
  const pathFrags: Map<string, string[]> = new Map();
  const meetingFrags: string[] = [];
  const s = oneDistance;

  frags.forEach(frag => matchByKind(frag, {
    "char-init": ci => pushMMap(pathFrags, ci.char.id, `M ${ci.pos.x * s} ${ci.pos.y * s} h ${ci.dx * s}`),
    "char-line": cl => pushMMap(pathFrags, cl.char.id, sPathFrag(scale(cl.sLine, s)), `h ${(cl.dx - cl.sLine.dx) * s}`),
    meeting: m => meetingFrags.push(meeting([(m.pos.x + m.dx / 2) * s, m.pos.y * s], m.dx * s / 3, m.dy * s)),
  }));

  return <React.Fragment>
    {[...pathFrags.entries().map(([id, frags]) =>
      <path key={id} d={frags.join(" ")} stroke="black" strokeWidth={2} fill="none" />
    )]}
    {meetingFrags.map((d, i) => <path key={'m' + i} d={d} stroke="black" strokeWidth={1} fill="white" />)}
  </React.Fragment>
}

const scale = ({ dx, dy, bs, offset }: SLine, s: number): SLine => ({ dx: s * dx, dy: s * dy, bs: s * bs, offset });

const meeting = (top: readonly [number, number], r: number, h: number) =>
  `M ${top[0] - r} ${top[1]} a ${r} ${r} 0 0 1 ${2 * r} 0 v ${h} a ${r} ${r} 0 0 1 ${-2 * r} 0 v ${-h}`;
