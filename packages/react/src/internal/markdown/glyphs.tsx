/**
 * The icons a drawn document needs, written out rather than imported.
 *
 * Every other glyph this package draws comes from `lucide-react`, through
 * `icons.tsx`. These cannot, for two reasons:
 *
 * - **The five alert icons** are drawn by `mawy-react/server` too, and every
 *   module of `lucide-react` says `'use client'`. A React Server Component that
 *   put a `NoteIcon` beside an alert handed the icon to the browser, so
 *   Lucide's `Icon`, its context and the drawings went down with the page and
 *   were hydrated there — the JavaScript that entry point exists to leave out.
 *   Here each is an `<svg>` and the shapes inside it, the markup Lucide writes
 *   for the same icon. The viewer, the editor and the server draw an alert with
 *   them, and the alert's bar draws its kinds with them, so there is one copy
 *   of each in the package rather than this one and Lucide's.
 * - **`image-off`** is drawn inside the stand-in for a picture that could not
 *   be fetched, which is a picture written as a string, and a component cannot
 *   be put in a string.
 *
 * A copy drifts from what it was copied from, so
 * `test/internal/markdown/glyphs.test.tsx` holds each of these to the Lucide
 * icon of the same name. A release of Lucide that redraws one fails there, and
 * the shapes are copied again from `lucide-react/dist/esm/icons`.
 *
 * The drawings are Lucide's, from the icons named beside each one below. Four
 * of them are derived from the Feather project, so both of their notices
 * apply:
 *
 * ISC License
 *
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 *
 * The MIT License (MIT) (for `info`, `alert-circle`, `alert-triangle` and
 * `alert-octagon`, which are derived from the Feather project)
 *
 * Copyright (c) 2013-present Cole Bemis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import * as React from 'react';
import type { MdAlertKind } from './ast.js';

/** The shapes inside an icon, each a tag and its attributes, in Lucide's order. */
type Drawing = readonly (readonly [
  tag: 'circle' | 'line' | 'path',
  attributes: Readonly<Record<string, string>>
])[];

const ALERT_DRAWINGS: Readonly<Record<MdAlertKind, Drawing>> = {
  // `info`
  note: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 16v-4' }],
    ['path', { d: 'M12 8h.01' }]
  ],
  // `lightbulb`
  tip: [
    [
      'path',
      {
        d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5'
      }
    ],
    ['path', { d: 'M9 18h6' }],
    ['path', { d: 'M10 22h4' }]
  ],
  // `circle-alert`, which Lucide also calls `alert-circle`
  important: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['line', { x1: '12', x2: '12', y1: '8', y2: '12' }],
    ['line', { x1: '12', x2: '12.01', y1: '16', y2: '16' }]
  ],
  // `triangle-alert`, which Lucide also calls `alert-triangle`
  warning: [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }]
  ],
  // `octagon-alert`, which Lucide also calls `alert-octagon`
  caution: [
    ['path', { d: 'M12 16h.01' }],
    ['path', { d: 'M12 8v4' }],
    [
      'path',
      {
        d: 'M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z'
      }
    ]
  ]
};

/**
 * The icon beside an alert's name, with the attributes `lucide-react` gives an
 * icon, in its order.
 *
 * The one difference is the class: Lucide adds `lucide` and a class named after
 * the icon, and here there is only `mawy-icon`, which is what the stylesheet
 * sizes an icon by. Neither of Lucide's is something an application is told it
 * can style: that is the `--mawy-*` tokens and the `.mawy-md-*` classes.
 */
export function alertIcon(kind: MdAlertKind): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mawy-icon"
      aria-hidden="true"
    >
      {ALERT_DRAWINGS[kind].map(([Shape, attributes], index) => (
        <Shape key={index} {...attributes} />
      ))}
    </svg>
  );
}

/**
 * The shapes the stand-in for a picture that could not be fetched is drawn
 * with: Lucide's `image-off`, written as markup, since the stand-in is an SVG
 * made into an address. See `standIn` in `live.tsx`.
 */
export const STAND_IN_ICON =
  '<line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.83-2.83"/>' +
  '<line x1="13.5" x2="6" y1="13.5" y2="21"/><line x1="18" x2="21" y1="12" y2="15"/>' +
  '<path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"/>' +
  '<path d="M21 15V5a2 2 0 0 0-2-2H9"/>';
