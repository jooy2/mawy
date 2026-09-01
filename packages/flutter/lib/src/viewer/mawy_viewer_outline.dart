/// The outline: every heading in the document, in order.
///
/// Built from the same slugs the renderer gives the headings, so an entry and
/// the heading it points at cannot disagree about which one it is.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/theme/tokens.dart';

/// The panel beside the document.
///
/// Every entry is a tab stop of its own, the way the React package's are: they
/// are `<button>`s in an `<ol>` there and nothing about a list of six headings
/// is worth a roving tab stop and a set of arrow keys to learn. A panel opened
/// by a keyboard has to be reachable by one, and the shortest way from the
/// button that opened it to the entry it was opened for is the next press of
/// Tab.
class MawyViewerOutline extends StatelessWidget {
  /// Creates an outline panel.
  const MawyViewerOutline({
    required this.entries,
    required this.tokens,
    required this.strings,
    required this.onSelected,
    super.key,
  });

  /// The headings, in the order they appear.
  final List<MdOutlineEntry> entries;

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// Called with the slug of whichever entry was chosen.
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      decoration: BoxDecoration(
        color: tokens.backgroundSunken,
        border: Border(right: BorderSide(color: tokens.border)),
      ),
      child: Semantics(
        container: true,
        label: strings.outline,
        child: entries.isEmpty
            ? Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  strings.outlineEmpty,
                  style: TextStyle(color: tokens.foregroundSubtle, fontSize: 13),
                ),
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                itemCount: entries.length,
                itemBuilder: (BuildContext context, int index) {
                  final MdOutlineEntry entry = entries[index];

                  return _Entry(entry: entry, tokens: tokens, onTap: () => onSelected(entry.slug));
                },
              ),
      ),
    );
  }
}

class _Entry extends StatefulWidget {
  const _Entry({required this.entry, required this.tokens, required this.onTap});

  final MdOutlineEntry entry;
  final MawyTokens tokens;
  final VoidCallback onTap;

  @override
  State<_Entry> createState() => _EntryState();
}

class _EntryState extends State<_Entry> {
  final FocusNode _node = FocusNode(debugLabel: 'MawyViewerOutline entry');

  bool _hovered = false;
  bool _focused = false;

  @override
  void dispose() {
    _node.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final int depth = widget.entry.depth;

    return Semantics(
      button: true,
      label: widget.entry.text,
      child: FocusableActionDetector(
        focusNode: _node,
        mouseCursor: SystemMouseCursors.click,
        shortcuts: mawyActivate,
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              widget.onTap();

              return null;
            },
          ),
        },
        onShowHoverHighlight: (bool on) => setState(() => _hovered = on),
        onShowFocusHighlight: (bool on) => setState(() => _focused = on),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: MawyMotion.durationOf(context),
            curve: MawyMotion.easing,
            padding: EdgeInsets.fromLTRB(8 + (depth - 1) * 10.0, 6, 8, 6),
            decoration: BoxDecoration(
              color: _hovered || _focused ? tokens.background : null,
              borderRadius: BorderRadius.circular(MawyRadius.small),
              // The toolbar's ring, drawn outside the row rather than inside
              // it, so an entry that has the focus is not a line of text that
              // has shifted by two pixels.
              boxShadow: _focused
                  ? <BoxShadow>[BoxShadow(color: tokens.accent, spreadRadius: 2)]
                  : null,
            ),
            child: Text(
              widget.entry.text,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                // The first two levels carry the structure; the rest are
                // detail, and drawing them all the same makes a wall of text
                // out of what is meant to be a map.
                color: depth <= 2 ? tokens.foreground : tokens.foregroundMuted,
                fontSize: depth == 1 ? 13.5 : 13,
                fontWeight: depth == 1 ? FontWeight.w600 : FontWeight.w400,
                height: 1.4,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
