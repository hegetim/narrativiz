/* SPDX-FileCopyrightText: 2024 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export function* windows2<T>(array: T[]) {
  for (let i = 0; i + 2 <= array.length; i++) {
    yield [array[i], array[i + 1]] as readonly [T, T];
  }
}
