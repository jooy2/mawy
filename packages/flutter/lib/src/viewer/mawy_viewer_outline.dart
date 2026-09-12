/// The outline: every heading in the document, in order.
///
/// Built from the same slugs the renderer gives the headings, so an entry and
/// the heading it points at cannot disagree about which one it is.
library;

import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/focus_visible.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/internal/toolbar.dart';
import 'package:mawy/src/markdown/ast.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

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
    required this.active,
    required this.onSelected,
    required this.onClose,
    this.frame = MawyFrame.box,
    super.key,
  });

  /// The headings, in the order they appear.
  final List<MdOutlineEntry> entries;

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// The heading the reader is currently at, from the document's scroll.
  final String? active;

  /// Called with the slug of whichever entry was chosen.
  final ValueChanged<String> onSelected;

  /// Called when the panel is asked to go away from inside it.
  ///
  /// The toolbar's button is a toggle and closes it too. This is the second
  /// way, and it is the React package's: a panel a reader opened is a panel
  /// they should be able to shut without going back to the control that
  /// opened it, and on a narrow screen that control may be off the end of a
  /// toolbar they would have to scroll.
  final VoidCallback onClose;

  /// Whether the viewer around it has a frame. With none, the panel grows one
  /// of its own: it stays beside the document rather than hovering over it — a
  /// card over the document would cover the headings it points at — and
  /// without the line down its edge it would read as the first two inches of
  /// the prose.
  final MawyFrame frame;

  @override
  Widget build(BuildContext context) {
    final bool floating = frame == MawyFrame.floating;

    return Container(
      width: 240,
      margin: floating ? const EdgeInsetsDirectional.fromSTEB(12, 12, 0, 12) : null,
      decoration: BoxDecoration(
        color: floating ? tokens.backgroundRaised : tokens.backgroundSunken,
        border: floating
            ? Border.all(color: tokens.border)
            : Border(right: BorderSide(color: tokens.border)),
        borderRadius: floating ? BorderRadius.circular(MawyRadius.large) : null,
        boxShadow: floating
            ? <BoxShadow>[
                BoxShadow(
                  color: const Color(0xFF101018).withValues(alpha: 0.14),
                  blurRadius: 28,
                  offset: const Offset(0, 10),
                ),
              ]
            : null,
      ),
      child: Semantics(
        container: true,
        label: strings.outline,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // What the panel is, and the way out of it. The React package
            // writes the same two, in the same order and the same words —
            // there the name is an `h2`, which is a thing this package has no
            // equivalent of, so it is a line of text with the panel's own
            // `Semantics` label carrying the name to a screen reader.
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(18, 10, 8, 0),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: ExcludeSemantics(
                      child: Text(
                        strings.outline.toUpperCase(),
                        style: TextStyle(
                          color: tokens.foregroundSubtle,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.66,
                        ),
                      ),
                    ),
                  ),
                  MawyToolbarButton(
                    icon: LucideIcons.x,
                    label: strings.close,
                    tokens: tokens,
                    onPressed: onClose,
                  ),
                ],
              ),
            ),
            Expanded(
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

                        return _Entry(
                          entry: entry,
                          tokens: tokens,
                          current: entry.slug == active,
                          onTap: () => onSelected(entry.slug),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Entry extends StatefulWidget {
  const _Entry({
    required this.entry,
    required this.tokens,
    required this.current,
    required this.onTap,
  });

  final MdOutlineEntry entry;
  final MawyTokens tokens;

  /// Whether this is the heading the reader is at.
  final bool current;

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
      selected: widget.current,
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
        onShowFocusHighlight: (bool on) => setState(() => _focused = on && MawyFocusVisible.wanted),
        child: GestureDetector(
          onTap: widget.onTap,
          child: AnimatedContainer(
            duration: MawyMotion.durationOf(context),
            curve: MawyMotion.easing,
            padding: EdgeInsets.fromLTRB(6 + (depth - 1) * 10.0, 6, 8, 6),
            decoration: BoxDecoration(
              color: _hovered || _focused ? tokens.background : null,
              borderRadius: BorderRadius.circular(MawyRadius.small),
            ),
            // The ring, drawn over the row rather than behind it: a shadow is a
            // filled shape, and behind a row with no background of its own it
            // is a block of accent with the words lost in it.
            foregroundDecoration: _focused
                ? BoxDecoration(
                    borderRadius: BorderRadius.circular(MawyRadius.small),
                    border: Border.all(color: tokens.accent, width: 2),
                  )
                : null,
            // The heading's words are the name of this control, and they are
            // said once — up there, where the control says what it is. Drawn
            // again here they are the same string a second time, and a screen
            // reader that is handed both reads the heading twice.
            //
            // The rule beside the current heading is its own box rather than a
            // border on the one above, because a border follows that box's
            // corner radius and two pixels of rule bent into a curve is the
            // bracket the stylesheet was changed away from drawing.
            child: Stack(
              // The rule sits outside the row's padding, against the panel's
              // own leading edge.
              clipBehavior: Clip.none,
              children: <Widget>[
                if (widget.current)
                  PositionedDirectional(
                    top: 1,
                    bottom: 1,
                    start: -6 - (depth - 1) * 10.0,
                    child: Container(width: 2, color: tokens.accent),
                  ),
                ExcludeSemantics(
                  child: Text(
                    widget.entry.text,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      // The first two levels carry the structure; the rest are
                      // detail, and drawing them all the same makes a wall of text
                      // out of what is meant to be a map.
                      color: widget.current
                          ? tokens.accent
                          : (depth <= 2 ? tokens.foreground : tokens.foregroundMuted),
                      fontSize: depth == 1 ? 13.5 : 13,
                      fontWeight: widget.current || depth == 1 ? FontWeight.w600 : FontWeight.w400,
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
