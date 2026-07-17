# body-muscles vendored path data

This directory vendors SVG path data from `body-muscles@1.0.0`.

- Source: https://github.com/vulovix/body-muscles
- Package: https://www.npmjs.com/package/body-muscles
- License: Apache-2.0
- Notice: see `NOTICE`

Only the front/back SVG path data is vendored. The PT Review app keeps its own Body Map marker and hotspot semantics; upstream muscle ids are not product domain terms.

Some project-specific path ids split visually verified subpaths out of an upstream composite path so the adapter can address a represented muscle without coloring adjacent geometry. These entries retain the upstream coordinates and license, use explicit anatomical names, and remain rendering details rather than backend domain vocabulary.
