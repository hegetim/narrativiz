/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import P from "parsimmon";
import { Storyline, StorylineMetadata, StorylineRealization } from "../model/Storyline";

/// parse SGB (Stanford GraphBase) or master files

interface SgbChar {
  code: string,
  name: string,
  description?: string,
}

interface SgbLayer {
  title: string,
  groups: string[][],
  groupDescriptions: string[] | undefined,
}

type MasterLayer = SgbLayer & { active: string[] };

type StrictT = 'strict' | 'loose'
type SgbT = 'sgb' | 'master'

interface SgbFile<T extends SgbT> {
  characters: SgbChar[]
  layers: T extends 'sgb' ? SgbLayer[] : MasterLayer[]
}

const _ = P.regex(/[ \t]*/);
const __ = P.regex(/[ \t]+/);

const commentLine: P.Parser<string> = P.regex(/\*(.*)/, 1).skip(P.end).desc("a comment line");
const blankLine: P.Parser<void> = _.then(P.newline).result(undefined).desc("a blank line");

const strictCharacterCode: P.Parser<string> = P.regexp(/[a-zA-Z0-9]{2}/).desc("a two digit character code");
const looseCharacterCode: P.Parser<string> = P.regex(/[a-zA-Z0-9]+/).desc("an alphanumeric character code");
const charCode = (strict: StrictT) => strict === 'strict' ? strictCharacterCode : looseCharacterCode;

const optCharDesc: P.Parser<string | undefined> = P.string(",").trim(_).then(P.regex(/.*/)).fallback(undefined);

// todo: trim char name+desc
const charLine = (strict: StrictT): P.Parser<SgbChar> =>
  P.seqObj(_, ['code', charCode(strict)], __, ['name', P.regex(/[^,\n\r\v\b\f]+/)], ['description', optCharDesc], P.end);

const charLines = (strict: StrictT): P.Parser<SgbChar[]> =>
  commentLine.many().then(charLine(strict)).atLeast(1);

const layerHead: P.Parser<string> =
  P.regex(/[^:\n\r\v\b\f]+/).map(s => s.trim()).skip(P.string(":").trim(_)).desc("layer name followed by a colon");

const layerGroup = (strict: StrictT): P.Parser<string[]> => P.sepBy1(charCode(strict), P.string(",").trim(_));
const layerGroups = (strict: StrictT): P.Parser<string[][]> => P.sepBy1(layerGroup(strict), P.string(";").trim(_));

const layerTail = (strict: StrictT): P.Parser<string[]> => P.string(":").trim(_).then(layerGroup(strict)).skip(P.end);

const optLayerDesc: P.Parser<string[] | undefined> =
  commentLine.atLeast(1).map(cs => cs[cs.length - 1]!.trim().split(/\s*;\s*/)).fallback(undefined);

const layerLine = <T extends SgbT>(strict: StrictT, sgb: SgbT): P.Parser<T extends 'sgb' ? SgbLayer : MasterLayer> =>
  P.seqObj<MasterLayer>(
    ['groupDescriptions', optLayerDesc],
    ['title', layerHead],
    ['groups', layerGroups(strict)],
    sgb === 'sgb' ? _.then(P.end).result(undefined) : ['active', layerTail(strict)],
  );

const layerLines = <T extends SgbT>(strict: StrictT, sgb: T): P.Parser<T extends 'sgb' ? SgbLayer[] : MasterLayer[]> =>
  layerLine(strict, sgb).atLeast(1) as P.Parser<MasterLayer[]>;

export const sgbFile = (strict: StrictT, dialect: 'sgb' | 'master'): P.Parser<SgbFile<'sgb' | 'master'>> => P.seqObj(
  P.alt(blankLine, commentLine).many(),
  ['characters', charLines(strict)],
  blankLine.atLeast(1),
  ['layers', layerLines(strict, dialect)],
  P.alt(blankLine, commentLine).many(),
);

// todo: char descriptions are discarded :(
const chars = (f: SgbFile<SgbT>) => f.characters.reduce((map, c) => map.set(c.code, c.name), new Map<string, string>());

const meta = (f: SgbFile<SgbT>) => [f.layers.map(l => l.title), f.layers.map(l => l.groupDescriptions ?? [])] as const;

export const sgb2storyline = (f: SgbFile<'sgb'>): readonly [Storyline, StorylineMetadata] => {
  const layers = f.layers.map(l => ({ meetings: l.groups }));
  const [layerDescriptions, meetingDescriptions] = meta(f);
  return [{ layers }, { characterDescriptions: chars(f), layerDescriptions, meetingDescriptions }];
}

export const master2storyline = (f: SgbFile<'master'>): readonly [Storyline, StorylineRealization, StorylineMetadata] => {
  const layers = f.layers.map(l => ({ meetings: l.groups.filter(g => g.every(id => l.active.some(a => a === id))) }));
  const layersOrdered = f.layers.map(l => l.groups.flat());
  const [layerDescriptions, meetingDescriptions] = meta(f);
  return [{ layers }, { layersOrdered }, { characterDescriptions: chars(f), layerDescriptions, meetingDescriptions }];
}
