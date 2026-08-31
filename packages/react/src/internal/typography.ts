import type { MawyMeasure, MawyTypography } from '../types.js';

/**
 * How a document is set when nobody has said otherwise.
 *
 * 16px and 1.7 rather than a browser's 16px and 1.2: this is a reading surface,
 * and the line height a paragraph of prose wants is the one thing a browser's
 * defaults are reliably wrong about.
 */
export const DEFAULT_TYPOGRAPHY: MawyTypography = {
  fontFamily: 'sans',
  fontSize: 16,
  lineHeight: 1.7,
  letterSpacing: 0,
  measure: 'normal'
};

/** What the toolbar's sliders may reach, and how finely. */
export const TYPOGRAPHY_RANGE = {
  fontSize: { min: 13, max: 26, step: 1 },
  lineHeight: { min: 1.3, max: 2.4, step: 0.05 },
  letterSpacing: { min: -0.04, max: 0.16, step: 0.005 }
} as const;

/**
 * How wide a column of text may run, per `MawyMeasure`.
 *
 * The three finite ones are between roughly 55 and 90 characters at the default
 * size, which is where a line stops being one a reader can return from and
 * still find the next one. `full` opts out, for a viewer already inside a
 * column somebody else decided the width of.
 */
export const MEASURE: Record<MawyMeasure, string> = {
  narrow: '34rem',
  normal: '44rem',
  wide: '56rem',
  full: 'none'
};

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}

/**
 * The typography, as the custom properties the stylesheet reads.
 *
 * Everything the document is set with goes through these five, so an
 * application that would rather drive the type itself can declare them on a
 * wrapping element and leave the toolbar off — the same tokens, reached from
 * the other side.
 */
export function typographyStyle(typography: MawyTypography): Record<string, string> {
  const size = clamp(
    typography.fontSize,
    TYPOGRAPHY_RANGE.fontSize.min,
    TYPOGRAPHY_RANGE.fontSize.max
  );

  return {
    '--mawy-doc-font': `var(--mawy-font-${typography.fontFamily})`,
    '--mawy-doc-size': `${size}px`,
    '--mawy-doc-line-height': String(
      clamp(typography.lineHeight, TYPOGRAPHY_RANGE.lineHeight.min, TYPOGRAPHY_RANGE.lineHeight.max)
    ),
    '--mawy-doc-letter-spacing': `${clamp(
      typography.letterSpacing,
      TYPOGRAPHY_RANGE.letterSpacing.min,
      TYPOGRAPHY_RANGE.letterSpacing.max
    )}em`,
    '--mawy-doc-measure': MEASURE[typography.measure] ?? MEASURE.normal
  };
}
