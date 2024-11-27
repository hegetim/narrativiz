/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { Storyline, WithAlignedGroups } from "../model/Storyline";
import { pushMMap, unimplemented } from "../model/Utils";
import { sPathFrag } from "./DrawingUtils";

const layerXDist = 100;
const layerWidth = 20;
const oneDistance = 40;

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

  story.layers.forEach((layer, i) => {
    layer.groups.forEach(group => {
      const blockSize = (group.characters.length - 1) * oneDistance;
      group.charactersOrdered.forEach((char, j) => {
        const x = i * (layerXDist + layerWidth);
        const y = (j + group.atY) * oneDistance;
        pushMMap(buf, char, [x, y] as const);
        pushMMap(buf, char, [x + layerWidth, y] as const);

        const prev = items.get(char);
        items.set(char, { at: [x + layerWidth, y], blockSize, offset: (i + 1) / group.characters.length });
        if (prev) {
          // todo: join blocks!
          pushMMap(frags, char, sPathFrag(layerWidth, y - prev.at[1], unimplemented(), unimplemented()));
          pushMMap(frags, char, `h ${layerWidth}`);
        } else {
          pushMMap(frags, char, `M ${x} ${y} h ${layerWidth}`);
        }
      })
    })
  })

  return <svg viewBox={bbox([...buf.values()].flat())}>
    {[...buf.entries().map(([id, [head, ...tail]]) =>
      <path key={id} d={mkPolyline(head!, tail)} stroke="black" strokeWidth={2} fill="none" />)]
    }
  </svg>
}

const mkPolyline = (pt: readonly [number, number], pts: (readonly [number, number])[]) =>
  pts.reduce((str, [x, y]) => `${str} L ${x} ${y}`, `M ${pt[0]} ${pt[1]}`);

const bbox = (pts: (readonly [number, number])[]) =>
  `-5 -5 ${Math.max(...pts.map(p => p[0])) + 10} ${Math.max(...pts.map(p => p[1])) + 10}`;
