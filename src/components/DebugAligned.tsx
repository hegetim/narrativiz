/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { Storyline, WithAlignedGroups } from "../model/Storyline";
import { pushMMap } from "../model/Utils";
import { sPathFrag } from "./DrawingUtils";

const layerXDist = 100;
const layerWidth = 20;
const oneDistance = 10;

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
            pushMMap(frags, char, sPathFrag(layerXDist, y - prev.at[1], jointBlockSize, jointOffset));
            pushMMap(frags, char, `h ${layerWidth}`);
          }
        } else {
          pushMMap(frags, char, `M ${x} ${y} h ${layerWidth}`);
        }
      })
    })
  })

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
  </React.Fragment>;
}

const joinBlocks = (sizeL: number, offsetL: number, sizeR: number, offsetR: number) => {
  console.info(`join blocks: l=${sizeL} @ ${offsetL}  r=${sizeR} @ ${offsetR}`)
  if (sizeL === sizeR && sizeL === 0) return [0, 0] as const;
  const top = Math.max(sizeL * offsetL, sizeR * offsetR);
  const btm = Math.max(sizeL * (1 - offsetL), sizeR * (1 - offsetR));
  return [top + btm, top / (top + btm)] as const;
}

const mkPolyline = (pt: readonly [number, number], pts: (readonly [number, number])[]) =>
  pts.reduce((str, [x, y]) => `${str} L ${x} ${y}`, `M ${pt[0]} ${pt[1]}`);

const bbox = (pts: (readonly [number, number])[]) => {
  const width = Math.max(...pts.map(p => p[0]));
  const height = Math.max(...pts.map(p => p[1]));
  return [width, height, `-5 -5 ${width + 10} ${height + 10}`] as const;
}

const meeting = (top: readonly [number, number], r: number, h: number) =>
  `M ${top[0] - r} ${top[1]} a ${r} ${r} 0 0 1 ${2 * r} 0 v ${h} a ${r} ${r} 0 0 1 ${-2 * r} 0 v ${-h}`;
