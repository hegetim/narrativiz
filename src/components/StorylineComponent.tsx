/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { matchByKind, pushMMap, unimplemented, windows2 } from "../model/Utils";
import { corners, DrawingFrag, JustifyConfig, justifyLayers, SLine } from "../model/Justify";
import { Storyline, WithAlignedGroups, WithLayerDescriptions } from "../model/Storyline";
import { sPathFrag } from "./DrawingUtils";
import xxStory from "../static/story.json";
import xxMeta from "../static/meta.json";

const xStory = xxStory as Storyline<WithAlignedGroups, WithLayerDescriptions>;
const xMeta = xxMeta as {
  chars: {
    [index: string]: {
      "wagon-type": string,
      "start-station": string,
      "end-station": string,
    }
  },
  meetings: {
    [index: string]: {
      station: string,
      "trip-number": string,
    }
  }
}

type Props = {
  story: Storyline<WithAlignedGroups, WithLayerDescriptions>,
  oneDistance: number,
  layerStyle: JustifyConfig['layerStyle'],
  blockHandling: JustifyConfig['blockHandling']
};

export const StorylineComponent = ({ story, oneDistance, layerStyle, blockHandling }: Props) => {
  console.log(JSON.stringify(story));
  const justified = justifyLayers(story, { layerStyle, blockHandling });
  const [x, y, w, h] = bbox(justified.flatMap(corners), oneDistance);
  return <div className="storyline-container">
    <svg viewBox={`${x - 10} ${y - 10} ${w + 20} ${h + 20}`} width={w + 30}>{drawFrags(oneDistance, justified)}</svg>
  </div>;
}

export const FakeStoryComponent = ({ }: {}) => {
  const oneDistance = 40
  const justified = justifyLayers(xStory, { layerStyle: 'condensed', blockHandling: 'continuous' });
  const [x, y, w, h] = bbox(justified.flatMap(corners), oneDistance);
  return <svg viewBox={`${x - 100} ${y - 100} ${w + 300} ${h + 300}`} width={w + 200}>
    <defs>
      <filter id="solid">
        <feFlood floodColor="white" result="bg" />
        <feComposite in="SourceGraphic" operator="over" />
      </filter>
    </defs>
    {annotateLayers(oneDistance, justified, y - 100, y + h + 200)}
    {drawFrags(oneDistance, justified)}
    {annotateFrags(oneDistance, justified)}
    {annotateTerminals(oneDistance, justified)}
  </svg>;
}

const bbox = (pts: (readonly [number, number])[], s: number = 1) => {
  const xmin = Math.min(...pts.map(p => p[0]));
  const ymin = Math.min(...pts.map(p => p[1]));
  const xmax = Math.max(...pts.map(p => p[0]));
  const ymax = Math.max(...pts.map(p => p[1]));
  return [xmin * s, ymin * s, (xmax - xmin) * s, (ymax - ymin) * s] as const;
}

const drawFrags = (oneDistance: number, frags: DrawingFrag[]) => {
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
      <path key={id} d={frags.join(" ")} stroke="black" strokeWidth={3} fill="none" />
    )]}
    {meetingFrags.map((d, i) => <path key={'m' + i} d={d} stroke="black" strokeWidth={1} fill="white" />)}
  </React.Fragment>
}

const scale = ({ dx, dy, bs, offset }: SLine, s: number): SLine => ({ dx: s * dx, dy: s * dy, bs: s * bs, offset });

const meeting = (top: readonly [number, number], r: number, h: number) =>
  `M ${top[0] - r} ${top[1]} a ${r} ${r} 0 0 1 ${2 * r} 0 v ${h} a ${r} ${r} 0 0 1 ${-2 * r} 0 v ${-h}`;

const annotateFrags = (oneDistance: number, frags: DrawingFrag[]) => {
  const s = oneDistance;
  const meetingId = (m: DrawingFrag & { kind: 'meeting' }) => `${xStory.layers[m.layer]?.layerDescription}_${m.topChar}`;

  return <React.Fragment>
    {[...frags.flatMap<React.ReactNode>((f, i) => matchByKind(f, {
      "char-init": ci => [""],
      // <text key={ci.char.id + '-'} x={ci.pos.x * s - 5} y={ci.pos.y * s} textAnchor="end">{xMeta.chars[ci.char.id]!['start-station']}</text>
      "char-line": cl => [""],
      meeting: m => [
        <text key={`${i}mr`} x={(m.pos.x + m.dx) * s + 5} y={(m.pos.y + m.dy / 2) * s + 6} textAnchor="start" filter="url(#solid)">{xMeta.meetings[meetingId(m)]!["trip-number"]}</text>,
        <text key={`${i}mt`} x={(m.pos.x + m.dx / 2) * s} y={(m.pos.y - m.dx / 3) * s - 3} textAnchor="middle">{xMeta.meetings[meetingId(m)]!.station}</text>,
      ],
    }))]}
  </React.Fragment>

}

const annotateTerminals = (oneDistance: number, frags: DrawingFrag[]) => {
  const s = oneDistance;
  const terms = new Map<string, readonly [number, number]>();
  frags.forEach(frag => matchByKind(frag, {
    "char-init": () => { },
    "char-line": cl => terms.set(cl.char.id, [cl.pos.x + cl.dx, cl.pos.y + cl.sLine.dy]),
    meeting: () => { }
  }));
  return <React.Fragment>
    {[...terms.entries().map(([id, pos]) => <text key={id} x={pos[0] * s + 80} y={pos[1] * s + 6}>{xMeta.chars[id]!['end-station']}</text>)]}
  </React.Fragment>;
}

const annotateLayers = (oneDistance: number, frags: DrawingFrag[], ymin: number, ymax: number) => {
  const s = oneDistance;
  const layers: { x: number, text: string }[] = [];
  frags.forEach(frag => matchByKind(frag, {
    "char-init": () => { },
    "char-line": () => { },
    meeting: m => layers[m.layer] = { x: m.pos.x, text: xStory.layers[m.layer]!.layerDescription },
  }));
  return <React.Fragment>
    {[...windows2(layers)].flatMap(([{ x: x1, text: key }, { x: x2, text: _1 }], i) => {
      if (i % 2 === 1) {
        return [<rect key={key} x={x1 * s} y={ymin} width={(x2 - x1) * s} height={ymax - ymin} stroke="none" fill="lightblue" opacity={0.25} />];
      } else { return []; }
    })}
    {layers.map(({ x, text }) => <text key={text} x={x * s + 3} y={ymax - 60}>{mkNice(text)}</text>)}
  </React.Fragment>
}

const mkNice = (s: String) => `${s.substring(2, 4)}:${s.substring(5, 7)}`
// 1d01h40m
// 01234567
