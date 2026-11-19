import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  CircleAlert,
  ImageOff,
  Info,
  Lightbulb,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react';
import { alertIcon, STAND_IN_ICON } from '../../../src/internal/markdown/glyphs.js';

/**
 * The icons a drawn document needs, written out in `glyphs.tsx` rather than
 * imported from `lucide-react`, which makes each of them a copy, and a copy
 * drifts. Each is held to the Lucide icon it was copied from, so a release of
 * Lucide that redraws one fails here rather than leaving an alert drawn in one
 * style and the toolbar beside it in another.
 */
describe('the icons written out for a drawn document', () => {
  const drawnByLucide = (Icon: LucideIcon) =>
    renderToStaticMarkup(<Icon className="mawy-icon" aria-hidden="true" />);

  it("draws each alert's icon as Lucide draws it, but for Lucide's class names", () => {
    const withoutClass = (markup: string) => markup.replace(/ class="[^"]*"/, '');

    for (const [kind, Icon] of [
      ['note', Info],
      ['tip', Lightbulb],
      ['important', CircleAlert],
      ['warning', TriangleAlert],
      ['caution', OctagonAlert]
    ] as const) {
      const drawn = renderToStaticMarkup(alertIcon(kind));

      expect(drawn, kind).toContain('class="mawy-icon"');
      expect(withoutClass(drawn), kind).toBe(withoutClass(drawnByLucide(Icon)));
    }
  });

  it("draws the stand-in for a picture with Lucide's `image-off`", () => {
    const inside = /<svg[^>]*>([\s\S]*)<\/svg>/.exec(drawnByLucide(ImageOff))?.[1] ?? '';

    // React closes each shape with a tag of its own, and the stand-in's shapes
    // are a string written with `/>`, which means the same thing in SVG.
    expect(inside.replace(/><\/\w+>/g, '/>')).toBe(STAND_IN_ICON);
  });
});
