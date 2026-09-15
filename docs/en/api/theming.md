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
| The document | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure`, `--mawy-doc-edit-measure`, `--mawy-doc-padding`, `--mawy-doc-image-aspect`, `--mawy-doc-image-fit` |
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

### Your page's own rules stop at the document

A page that styles prose writes `article p { padding: 4px 8px }` or `ul { list-style-type: square }` against bare element names, and those rules used to land on a Mawy document as readily as on the rest of the page. They no longer do: inside `.mawy-md`, every element the parser produces has its box, type, colour and list marker set back to the browser's own before this stylesheet says what they are.

It is a defence rather than a wall, and a selector that means it still wins:

```css
/* Reaches the document. Two classes and an element, which is more specific
   than the reset and is read as an application overriding the library. */
.my-docs .mawy-md p {
  padding: 4px 8px;
}
```

Two things are deliberately left alone. `div` and `span` are not reset, because a directive is drawn out of the application's own markup and resetting that would take the application's styling off its own widget. And the tokens are untouched, because redeclaring one is how this is meant to be done.

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
