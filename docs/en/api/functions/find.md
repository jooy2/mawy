---
title: Finding text
order: 5
---

# Finding text

The arithmetic behind the find bar, exported so an application can drive it from an interface of its own.

::: fw react

The find bar is the viewer's and the editor's own — [`'find'`](../types/viewer-toolbar-item) on either toolbar, and `Mod`+`F` whether the button is drawn or not. The functions under it are internal: a browser has `window.find` and a `<textarea>` has `setSelectionRange`, so an application driving its own search has what it needs already.

:::

::: fw flutter

```dart
List<MawyMatch> findMatches(String value, String query, bool matchCase, {bool regex = false});
int matchFrom(List<MawyMatch> matches, int caret, {required bool forwards});
MawyReplaced replaceMatch(String value, MawyMatch match, String replacement);
MawyReplacedAll replaceAll(String value, String query, String replacement, bool matchCase, {bool regex = false});
String replacementFor(String value, MawyMatch match, String query, String replacement, bool matchCase);
bool invalidPattern(String query, {required bool regex});
```

Pure functions over strings. What "replace all" does to overlapping matches is a question about arithmetic, and a test that has to mount an editor to ask it is a test nobody writes the awkward half of. It is `src/internal/search.ts` in Dart, function for function, and `tool/parity.dart` diffs the two.

| Type | What it is |
| --- | --- |
| `MawyMatch` | Where one match sits in the document: `start` and `end`. |
| `MawyReplaced` | A document as a replacement left it, and where the caret went: `value` and `caret`. |
| `MawyReplacedAll` | A document as "replace all" left it, and how many it replaced: `value` and `count`. |

`matchFrom` answers with an index into `matches`, or `-1` when there is nothing to go to. Forwards means the first match starting at or after the caret, backwards the last starting before it, and both wrap — a search that stops at the end of the file is one you have to scroll to the top to finish.

`replaceAll` works in one pass rather than looping over `replaceMatch`, and not for speed: replacing `a` with `aa` a match at a time would find the replacement and replace that too, for ever. What is searched is the document as it was.

**Plain text unless `regex` is set.** An editor whose find box quietly compiled `(` into a syntax error would be one a writer could not trust with a document, and a Markdown document is full of `*`, `[`, `.` and `+`, so a pattern is something switched on. With `regex`, the query is a Dart regular expression, which reads the same as JavaScript's, with `^` and `$` at the ends of each line; a match of nothing at all is passed over, and a query that is not a pattern finds nothing, which `invalidPattern` says. `replaceAll` writes what each match captured into the replacement — `$&` the whole match, `$1` to `$99` a numbered group, `$<name>` a named one and `$$` a dollar sign — and `replacementFor` is that replacement for one match, to hand to `replaceMatch`.

:::
