---
title: Theming
order: 4
---

# Theming

Every colour, radius and duration the library draws with, in one place, and the whole of what an application may change.

::: fw react

## `mawy-react/styles.css`

The finished stylesheet, imported once by the embedding application. Every value the library draws with is a `--mawy-*` custom property, and that namespace is the entire supported surface for theming.

```css
@import 'mawy-react/styles.css';
```

The tokens are declared on **`.mawy-root`** rather than on `:root`. A component library has no business writing to the document element, and a viewer that read its palette from `:root` could not be dark inside a light page. They cascade, so one declaration on a wrapping element reaches every Mawy surface inside it.

```css
.my-docs {
  --mawy-accent: #b8005c;
}
```

## The properties

| Group | Properties |
| --- | --- |
| Type | `--mawy-font-sans`, `--mawy-font-serif`, `--mawy-font-mono` |
| The document | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure`, `--mawy-doc-image-aspect`, `--mawy-doc-image-fit` |
| Surfaces | `--mawy-bg`, `--mawy-bg-sunken`, `--mawy-bg-raised`, `--mawy-chrome` |
| Text | `--mawy-fg`, `--mawy-fg-muted`, `--mawy-fg-subtle` |
| Lines | `--mawy-border`, `--mawy-border-strong` |
| Accent | `--mawy-accent`, `--mawy-accent-hover`, `--mawy-accent-fg`, `--mawy-accent-soft` |
| Code | `--mawy-code-bg`, `--mawy-code-fg`, `--mawy-mark-bg`, `--mawy-mark-fg` |
| Syntax colouring | `--mawy-hl-comment`, `--mawy-hl-string`, `--mawy-hl-number`, `--mawy-hl-keyword`, `--mawy-hl-type`, `--mawy-hl-function`, `--mawy-hl-variable`, `--mawy-hl-punctuation` |
| Finding | `--mawy-find`, `--mawy-find-current` |
| Alerts | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| The editor's source surface | `--mawy-src-size`, `--mawy-src-line`, `--mawy-src-pad-x`, `--mawy-src-pad-y`, `--mawy-src-gap`, `--mawy-src-indent`, `--mawy-gutter`, `--mawy-split`, `--mawy-placeholder`, `--mawy-syntax-marker`, `--mawy-syntax-code`, `--mawy-syntax-link`, `--mawy-syntax-muted` |
| Shape and motion | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

The class names the document is drawn with are `.mawy-md-*` and are also part of the supported surface, so an application can restyle a table or a code block without the library exposing a render prop for it.

:::

::: fw flutter

## `MawyTokens`

```dart
class MawyTokens {
  static const MawyTokens light;
  static const MawyTokens dark;
  static MawyTokens of(Brightness brightness);
  MawyTokens copyWith({Brightness? brightness, Color? background, /* … */});
}

typedef MawyTokensBuilder = MawyTokens Function(Brightness brightness);
```

Every colour a document and its interface are drawn in, as one object. The fields are the React package's `--mawy-*` custom properties under the names Dart would give them: `background`, `backgroundSunken`, `backgroundRaised`, `chrome`, `foreground`, `foregroundMuted`, `foregroundSubtle`, `border`, `borderStrong`, `accent`, `accentHover`, `accentForeground`, `accentSoft`, `find`, `findCurrent`, `codeBackground`, `codeForeground`, `markBackground`, `markForeground`, the eight `highlight*` colours a coloured code block is drawn in, and one per alert kind. The values are copied from the stylesheet rather than chosen again, so a colour that is `#5b34ea` in a browser is `#5b34ea` in an app.

The viewer picks `light` or `dark` from its own `colorScheme` and does not read a global, which is what lets one document be dark inside a light screen.

An application wanting its own colours passes `tokens`, which is a `MawyTokensBuilder` rather than a single palette. The viewer settles on its brightness after it has been handed everything else, so a document following the platform needs values ready in both palettes. Build one with `copyWith`: start from `MawyTokens.of(brightness)` and name only what differs, instead of writing every colour out to change one.

```dart
MawyViewer(
  value: document,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
);
```

The export is also for an application drawing its own interface beside a document and wanting the same colours in it.

## `MawyRadius` and `MawyMotion`

```dart
abstract final class MawyRadius {
  static const double small = 6; // a code span, a chip
  static const double medium = 9; // a button, a field
  static const double large = 14; // a card, a menu, a code block
}

abstract final class MawyMotion {
  static const Duration duration = Duration(milliseconds: 140);
  static const Cubic easing = Cubic(0.2, 0, 0.2, 1);
}
```

The corner radii, which are three sizes rather than a scale, and the one duration and one curve everything that moves uses. They are the React package's `--mawy-radius-*`, `--mawy-duration` and `--mawy-easing`, value for value, the way `MawyTokens` is its colours.

:::
