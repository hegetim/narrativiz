/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import highsLoader from 'highs'
import { StorylineRealization } from './Storyline';
import _ from 'lodash';

export type AlignCriterion = "sum-of-heights" | "least-squares";

const highs = highsLoader({ locateFile: (file: string) => "https://lovasoa.github.io/highs-js/" + file });

const align = (r: StorylineRealization, mode: AlignCriterion) => 0;

const mkConstraints = (r: StorylineRealization, gapRatio: number) => {
  let cnt = 0;
  const res: string[] = [];

  for (let layer of r.layers) {
    let rem = null;
    for (let group of layer.groups) {
      if (group.ordered.length === 0) {
        throw new Error(`layer ${layer} has an empty group`);
      } else {
        if (rem !== null) { res.push(`y${cnt} - y${rem} >= ${gapRatio}`); } // not the same group!
        cnt += 1;
      }
      _.range(1, group.ordered.length).forEach(() => {
        res.push(`y${cnt} - y${cnt - 1} = 1`); // in the same group!
        cnt += 1;
      });
      rem = cnt - 1;
    }
  }
}

// todo:
//  anchor constraint:  y0 = 0
//  optimization function
