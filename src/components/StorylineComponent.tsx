/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from "react";
import { matchByKind, pushMMap, unimplemented, windows2 } from "../model/Utils";
import { corners, DrawingFrag, JustifyConfig, justifyLayers, Pos, SLine } from "../model/Justify";
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
    }
  },
  meetings: {
    [index: string]: {
      "departure-station": string,
      "departure-time": string,
      "arrival-station": string,
      "arrival-time": string,
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
  // console.log(JSON.stringify(story));
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
    {/* {annotateLayers(oneDistance, justified, y - 100, y + h + 200)} */}
    {drawFrags(oneDistance, justified)}
    {/* {annotateFrags(oneDistance, justified)} */}
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
    {/* {mkContinuedMeetings(frags, oneDistance)} */}
  </React.Fragment>
}

const scale = ({ dx, dy, bs, offset }: SLine, s: number): SLine => ({ dx: s * dx, dy: s * dy, bs: s * bs, offset });

const meeting = (top: readonly [number, number], r: number, h: number) =>
  `M ${top[0] - r} ${top[1]} a ${r} ${r} 0 0 1 ${2 * r} 0 v ${h} a ${r} ${r} 0 0 1 ${-2 * r} 0 v ${-h}`;

// TODO:
//  - terminal annotations
//  - width dependent annotations
const SMALL_MEETING = 64;
const LARGE_MEETING = 128;

const mkContinuedMeetings = (frags: DrawingFrag[], s: number) => {
  const mFrags: React.JSX.Element[] = [];
  const aFrags: React.JSX.Element[] = [];

  const departures = new Map<string, DrawingFrag & { kind: 'meeting' }>();
  const arrivals = new Map<string, Pos>();

  const r = 0.25 * s;

  const addMeeting = (id: string, dep: DrawingFrag & { kind: 'meeting' }, i: number) => {
    const arrival = arrivals.get(id);
    if (arrival === undefined) { throw new Error("next trip started but arrival is undefined") }
    const h = dep.dy * s;
    const path = `M${dep.pos.x * s} ${dep.pos.y * s} a${r} ${r} 0 0 1 ${r} ${-r}`
      + ` H${arrival.x * s + r} a${r} ${r} 0 0 1 ${r} ${r} v${h} a${r} ${r} 0 0 1 ${-r} ${r}`
      + ` H${dep.pos.x * s + r} a${r} ${r} 0 0 1 ${-r} ${-r} v${-h} z`
    mFrags.push(<path key={'m' + i} d={path} stroke="black" strokeWidth={1} fill="white" />);
    const width = (arrival.x - dep.pos.x) * s;
    const mMeta = xMeta.meetings[meetingId(dep)]!;
    const text = width >= LARGE_MEETING ?
      `${mMeta["departure-station"]} ${mMeta["trip-number"]} ${mMeta["arrival-station"]}` :
      width >= SMALL_MEETING ? `${mMeta["departure-station"]} ${mMeta["trip-number"]}` :
        mMeta["trip-number"];
    const cls = width >= LARGE_MEETING ? 'm-large' : width >= SMALL_MEETING ? 'm-mid' : 'm-small';
    aFrags.push(
      <text key={`${i}mt`} className={cls} x={dep.pos.x * s + 7} y={(dep.pos.y + dep.dy / 2) * s + 6}>{text}</text>
    );
    if (width < SMALL_MEETING) {
      aFrags.push(<text key={`${i}ma`} className={cls} x={dep.pos.x * s} y={dep.pos.y * s - 12} textAnchor="middle">
        {mMeta["departure-station"]}
      </text>);
    }
  }

  frags.forEach((frag, i) => matchByKind(frag, {
    "char-init": () => { },
    "char-line": () => { },
    meeting: m => {
      const mMeta = xMeta.meetings[meetingId(m)];
      const departure = departures.get(m.topChar);
      if (mMeta !== undefined) {
        if (departure !== undefined) { addMeeting(m.topChar, departure, i); }
        departures.set(m.topChar, m);
      } else {
        arrivals.set(m.topChar, m.pos);
      }
      // const fill = xMeta.meetings[meetingId(m)] === undefined ? "white" : "lightblue"
      // const path = meeting([(m.pos.x + m.dx / 2) * s, m.pos.y * s], m.dx * s / 3, m.dy * s);
      // mFrags.push(<path key={'m' + i} d={path} stroke="black" strokeWidth={1} fill={fill} />);
    }
  }));
  departures.entries().forEach(([id, dep], j) => {
    addMeeting(id, dep, frags.length + j);
    const mMeta = xMeta.meetings[meetingId(dep)];
    const arrival = arrivals.get(id);
    if (arrival === undefined) { throw new Error("next trip started but arrival is undefined") }
    if ((arrival.x - dep.pos.x) * s < LARGE_MEETING) {
      aFrags.push(<text key={'a' + j} x={arrival.x * s + 2 * r + 5} y={(dep.pos.y + dep.dy / 2) * s + 6}>
        {mMeta?.["arrival-station"]}
      </text>);
    }
  });

  return [...mFrags, ...aFrags];
}

const meetingId = (m: DrawingFrag & { kind: 'meeting' }) => `${xStory.layers[m.layer]?.layerDescription}_${m.topChar}`;

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
    {layers.map(({ x, text }, i) => <text key={text} x={x * s + 3} y={ymax - 60 + (i % 2) * 20}>{mkNice(text)}</text>)}
  </React.Fragment>
}

const mkNice = (s: String) => `${s.substring(2, 4)}:${s.substring(5, 7)}`
// 1d01h40m
// 01234567
