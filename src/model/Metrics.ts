/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import _ from "lodash";
import { Storyline, WithAlignedGroups } from "./Storyline";
import { pushMMap, windows2 } from "./Utils";
import { corners, DrawingFrag } from "./Justify";

type InGroup = { groupId: string, y: number };
type CharLines = Map<string, InGroup[]>;

const eps = 1e-6;

export const printMetrics = (story: Storyline<WithAlignedGroups>, frags: DrawingFrag[]) => {
  const lines = toCharLines(story);
  const allMetrics = { ...baseMetrics(story), ...metrics(lines), ...drawingMetrics(frags) };
  console.log(allMetrics);
}

const baseMetrics = (story: Storyline<WithAlignedGroups>) => {
  const nLayers = story.layers.length;
  const nMeetings = story.layers.map(l => l.groups.filter(g => g.kind === 'active').length).reduce((a, b) => a + b);
  const nChars = _.uniq(story.layers.flatMap(l => l.groups.flatMap(g => g.characters))).length;
  return { nLayers, nMeetings, nChars };
}

const toCharLines = (story: Storyline<WithAlignedGroups>): CharLines => {
  const characters: CharLines = new Map();

  story.layers.forEach((layer, i) => {
    layer.groups.forEach((group, j) => {
      group.charactersOrdered.forEach((cId, offset) =>
        pushMMap(characters, cId, { groupId: `l${i}g${j}`, y: group.atY + offset })
      );
    });
  });

  return characters;
}

const metrics = (lines: CharLines) => {
  let [wc, lwh, qwh, ymin, ymax] = [0, 0, 0, Infinity, -Infinity];
  for (let igs of lines.values()) {
    ymin = Math.min(ymin, ...igs.map(g => g.y));
    ymax = Math.max(ymax, ...igs.map(g => g.y));
    for (let [a, b] of windows2(igs)) {
      const wh = Math.abs(a.y - b.y);
      if (wh > eps) { wc += 1; }
      lwh += wh;
      qwh += wh * wh;
    }
  }
  return { wc, lwh, qwh, th: ymax - ymin };
}

const drawingMetrics = (frags: DrawingFrag[]) => {
  const pts = frags.flatMap(corners);

  const xmin = Math.min(...pts.map(p => p[0]));
  const ymin = Math.min(...pts.map(p => p[1]));
  const xmax = Math.max(...pts.map(p => p[0]));
  const ymax = Math.max(...pts.map(p => p[1]));

  const tw = xmax - xmin;
  const area = tw * (ymax - ymin);

  return { tw, area };
}
