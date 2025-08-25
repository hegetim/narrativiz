import _ from "lodash";
import { Storyline, StorylineLayer, WithAlignedGroups } from "./Storyline";
import { assertNever, assertThat, ifDefined, matchByKind, matchString, windows2 } from "./Utils";
import { DrawingFrag, JustifyConfig } from "./Justify";

type ItemState = {
  char: string,
  yl: number | undefined,
  yr: number | undefined,
  leftGapSize: number | undefined,
  leftGapChar: string | undefined,
  rightGapSize: number | undefined,
  rightGapChar: string | undefined,
};

const eps = 1e-6;

export const justifyLayers = (s: Storyline<WithAlignedGroups>, layerStyle: JustifyConfig['layerStyle']): DrawingFrag[] => {
  justifyLayer(s.layers[0]!, s.layers[1]!);
  return [];
}

const initState = (char: string): ItemState => ({
  char,
  yl: undefined,
  yr: undefined,
  leftGapSize: undefined,
  leftGapChar: undefined,
  rightGapSize: undefined,
  rightGapChar: undefined
});

const justifyLayer = (l: StorylineLayer<WithAlignedGroups>, r: StorylineLayer<WithAlignedGroups>) => {
  const chars = new Map<string, ItemState>(
    [...l.groups.flatMap(g => g.characters), ...r.groups.flatMap(g => g.characters)]
      .map(key => [key, initState(key)] as const)
  );
  l.groups.forEach(g => g.charactersOrdered.forEach((c, i) => chars.get(c)!.yl = g.atY + i));
  r.groups.forEach(g => g.charactersOrdered.forEach((c, i) => chars.get(c)!.yr = g.atY + i));
  const [cl, cr] = [l.groups.flatMap(g => g.charactersOrdered), r.groups.flatMap(g => g.charactersOrdered)];
  cl.forEach((a, i) => {
    ifDefined(checkItem(chars.get(a)), ([charA, yla, yra]) => {
      if (yla > yra) { // upward
        let stop = false;
        for (let j = i + 1; !stop && j < cl.length; j++) {
          ifDefined(checkItem(chars.get(cl[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.leftGapSize = ylb - yla;
              charA.leftGapChar = charB.char;
              stop = true;
            }
          });
        }
      }
      if (yla < yra) { // downward
        let stop = false;
        for (let j = i - 1; !stop && j >= 0; j--) {
          ifDefined(checkItem(chars.get(cl[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.leftGapSize = yla - ylb;
              charA.leftGapChar = charB.char;
              stop = true;
            }
          });
        }
      }
    });
  });
  cr.forEach((a, i) => {
    ifDefined(checkItem(chars.get(a)), ([charA, yla, yra]) => {
      if (yla > yra) { // upward
        let stop = false;
        for (let j = i - 1; !stop && j >= 0; j--) {
          ifDefined(checkItem(chars.get(cr[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.rightGapSize = yra - yrb;
              charA.rightGapChar = charB.char;
              stop = true;
            }
          });
        }
      }
      if (yla < yra) { // downward
        let stop = false;
        for (let j = i + 1; !stop && j < cl.length; j++) {
          ifDefined(checkItem(chars.get(cr[j]!)), ([charB, ylb, yrb]) => {
            if (checkPair(yla, yra, ylb, yrb)) {
              charA.rightGapSize = yrb - yra;
              charA.rightGapChar = charB.char;
              stop = true;
            }
          });
        }
      }
    });
  });
  // todo check for narrowing or widening gaps
  // todo continue here...
  cl.forEach(char => console.log(chars.get(char)));
}

const checkItem = (item: ItemState | undefined) =>
  item && item.yl !== undefined && item.yr !== undefined && Math.abs(item.yl - item.yr) > eps
    ? [item, item.yl, item.yr] as const
    : undefined;

const checkPair = (yla: number, yra: number, ylb: number, yrb: number) =>
  (yla < ylb) === (yra < yrb) // non-crossing
  && Math.min(yla, yra) <= Math.max(ylb, yrb) + eps && Math.max(yla, yra) + eps >= Math.min(ylb, yrb) // related
  && (yla < yra) === (ylb < yrb); // co-oriented
