/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { Storyline, WithAlignedGroups } from "../model/Storyline";
import { matchByKind, pushMMap } from "../model/Utils";
import { sPathFrag } from "./DrawingUtils";
import { corners, DrawingFrag, justifyLayers, SLine } from "../model/Justify";

const layerXDist = 100;
const layerWidth = 20;
const oneDistance = 20;

interface Props {
  story: Storyline<WithAlignedGroups>
}

type Item = {
  at: readonly [number, number],
  blockSize: number,
  offset: number,
}

export const DebugAlignedComponent = ({ story }: Props) => {
  const buf: Map<string, (readonly [number, number])[]> = new Map();
  const frags: Map<string, string[]> = new Map();
  const items: Map<string, Item> = new Map();
  const meetings: string[] = [];

  story.layers.forEach((layer, i) => {
    layer.groups.forEach(group => {
      const x = i * (layerXDist + layerWidth);
      const blockSize = (group.characters.length - 1) * oneDistance;
      if (group.kind === 'active') {
        meetings.push(meeting(
          [x + layerWidth / 2, group.atY * oneDistance],
          layerWidth / 3,
          (group.characters.length - 1) * oneDistance
        ));
      }
      group.charactersOrdered.forEach((char, j) => {
        const y = (j + group.atY) * oneDistance;
        pushMMap(buf, char, [x, y] as const);
        pushMMap(buf, char, [x + layerWidth, y] as const);

        const prev = items.get(char);
        const offset = group.characters.length === 1 ? 0 : j / (group.characters.length - 1);
        items.set(char, { at: [x + layerWidth, y], blockSize, offset });
        if (prev) {
          if (prev.at[1] === y) {
            pushMMap(frags, char, `H ${x + layerWidth}`);
          } else {
            const [jointBlockSize, jointOffset] = joinBlocks(prev.blockSize, prev.offset, blockSize, offset);
            pushMMap(frags, char, sPathFrag({ dx: layerXDist, dy: y - prev.at[1], bs: jointBlockSize, offset: jointOffset }));
            pushMMap(frags, char, `h ${layerWidth}`);
          }
        } else {
          pushMMap(frags, char, `M ${x} ${y} h ${layerWidth}`);
        }
      })
    })
  })

  const justified = justifyLayers(story)
  console.log({ justified })

  const [width, _height, vbox] = bbox([...buf.values()].flat())

  return <React.Fragment>
    <svg viewBox={vbox} width={width}>
      {[...buf.entries().map(([id, [head, ...tail]]) =>
        <path key={id} d={mkPolyline(head!, tail)} stroke="black" strokeWidth={2} fill="none" />
      )]}
      {meetings.map((d, i) => <path key={'m' + i} d={d} stroke="black" strokeWidth={1} fill="white" />)}
    </svg>
    <svg viewBox={vbox} width={width}>
      {[...frags.entries().map(([id, frags]) =>
        <path key={id} d={frags.join(" ")} stroke="black" strokeWidth={2} fill="none" />
      )]}
      {meetings.map((d, i) => <path key={'m' + i} d={d} stroke="black" strokeWidth={1} fill="white" />)}
    </svg>
    <svg viewBox={bbox(justified.flatMap(corners), oneDistance)[2]} width={width}>{drawFrags(justified)}</svg>
  </React.Fragment>;
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

const joinBlocks = (sizeL: number, offsetL: number, sizeR: number, offsetR: number) => {
  // console.info(`join blocks: l=${sizeL} @ ${offsetL}  r=${sizeR} @ ${offsetR}`)
  if (sizeL === sizeR && sizeL === 0) return [0, 0] as const;
  const top = Math.max(sizeL * offsetL, sizeR * offsetR);
  const btm = Math.max(sizeL * (1 - offsetL), sizeR * (1 - offsetR));
  return [top + btm, top / (top + btm)] as const;
}

const mkPolyline = (pt: readonly [number, number], pts: (readonly [number, number])[]) =>
  pts.reduce((str, [x, y]) => `${str} L ${x} ${y}`, `M ${pt[0]} ${pt[1]}`);

const bbox = (pts: (readonly [number, number])[], s: number = 1) => {
  const width = Math.max(...pts.map(p => p[0]));
  const height = Math.max(...pts.map(p => p[1]));
  return [width * s, height * s, `-10 -10 ${width * s + 20} ${height * s + 20}`] as const;
}

const meeting = (top: readonly [number, number], r: number, h: number) =>
  `M ${top[0] - r} ${top[1]} a ${r} ${r} 0 0 1 ${2 * r} 0 v ${h} a ${r} ${r} 0 0 1 ${-2 * r} 0 v ${-h}`;
