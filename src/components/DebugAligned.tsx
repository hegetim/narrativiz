/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { Storyline, WithAlignedGroups } from "../model/Storyline";
import { pushMMap } from "../model/Utils";

const layerXDist = 100;
const layerWidth = 20;
const oneDistance = 40;

interface Props {
  story: Storyline<WithAlignedGroups>
}

export const DebugAlignedComponent = ({ story }: Props) => {
  const buf: Map<string, (readonly [number, number])[]> = new Map();

  story.layers.forEach((layer, i) => {
    layer.groups.forEach(group => {
      group.charactersOrdered.forEach((char, j) => {
        const x = i * (layerXDist + layerWidth);
        const y = (j + group.atY) * oneDistance;
        pushMMap(buf, char, [x, y] as const);
        pushMMap(buf, char, [x + layerWidth, y] as const);
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
