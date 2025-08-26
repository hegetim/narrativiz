<!--- SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
      SPDX-License-Identifier: CC-BY-SA-4.0
--->
NarratiViz
==========

Storyline visualizations show interactions between a given set of characters over time.
Each character is represented by an x-monotone curve.  A meeting among characters requires
the corresponding curves to form a continuous block.  Therefore, character curves may
have to cross each other.

NarratiViz is a tool designed to visualize storyline instances with fixed layer ordering.
See [this document](https://osf.io/ncasz) for details regarding the file format.
Our algorithms perform wiggle minimization, that is, finding y-coordinates for each
character line at each layer such that several quality metrics are optimized, and
create a visually pleasing geometric represantionen for layer transitions.


Host Your Own Instance
----------------------

NarratiViz is a React webapp written in TypeScript and provides a webpack build
script.  When building it yourself the only prerequisite is npm.

Download the repository and run

```
npm install
```

in order to download the required dependencies.

Then run
```
npm run build
```

to create a production build.

The resulting artifacts can be found in the `./build` directory.  You may host
these locally for testing for example using the python webserver:

```
cd ./build
python3 -m http.server
```


Publication
-----------

Most of the algorithms are described in an upcoming publication at GD2025.


Contributors
------------

This library has been developed by the [algorithms and complexity group](https://www.informatik.uni-wuerzburg.de/algo/team/),
University of Würzburg, Germany.

For contact, you can write an email to ``hegemann *at* informatik *dot* uni-wuerzburg *dot* de``.


