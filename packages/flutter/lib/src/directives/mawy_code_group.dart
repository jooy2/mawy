/// One piece of code written several ways, drawn as tabs.
///
/// The same thing in Dart, JavaScript and Python is three code blocks that say
/// one thing, and a screen that stacks all three makes a reader scroll past two
/// answers to reach theirs. Every set of documentation has a block for it,
/// under a name of its own: `code-group`, `tabs`, `lang`.
///
/// Which is why this is a widget rather than something the parser knows. The
/// parser reads the shape and stops there — see [MawyDirective] — so the name
/// is the application's to choose, and this is the drawing to give it:
///
/// ```dart
/// MawyViewer(
///   value: document,
///   directives: <String, MawyDirectiveBuilder>{
///     'code-group': (BuildContext context, MawyDirective directive) =>
///         MawyCodeGroup(tokens: tokens, directive: directive),
///   },
/// );
/// ```
///
/// It is `components/directives/MawyCodeGroup.tsx` in Dart, and the two are
/// meant to name their tabs the same way and move between them with the same
/// keys.
library;

import 'package:flutter/widgets.dart';
import 'package:mawy/src/internal/inside_box.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

/// A line that opens or closes a fenced block: its marker, its language, and
/// whatever else it wrote after that.
final RegExp _fence = RegExp(r'^[ \t]*(`{3,}|~{3,})[ \t]*([^\s`~]*)[ \t]*(.*)$');

/// The `[Some name]` a fence wrote after its language.
final RegExp _fenceName = RegExp(r'\[([^\]]*)\]');

/// What each block of [source] calls itself, in order.
///
/// Its `[Some name]` where it wrote one and its language otherwise. The name in
/// brackets is what VitePress, Docusaurus and the rest read, so a document
/// written for one of those arrives here with its tabs already named; it is
/// nothing to the parser, which keeps it as the fence's `meta` and draws none
/// of it.
///
/// Read by walking rather than by matching every fence, because a closing fence
/// is a fence too: matched all at once, a group of two blocks comes back with
/// four names and every other one empty. A block closes on the marker it opened
/// with, at least as long and with nothing after it.
List<String> _namesIn(String source) {
  final List<String> out = <String>[];
  String? open;

  for (final String line in source.split('\n')) {
    final RegExpMatch? found = _fence.firstMatch(line);

    if (found == null) {
      continue;
    }

    final String marker = found.group(1)!;
    final String language = found.group(2)!;

    if (open == null) {
      open = marker;

      final String name = _fenceName.firstMatch(found.group(3)!)?.group(1)!.trim() ?? '';

      out.add(name.isNotEmpty ? name : language);
    } else if (marker[0] == open[0] && marker.length >= open.length && language.isEmpty) {
      open = null;
    }
  }

  return out;
}

/// What each tab is called.
///
/// `{tabs=…}` first, because it is the group's own list and was written knowing
/// what is in it. Then what the block called itself — its `[Some name]`, or the
/// language it was fenced with — and then the block's number, so a group always
/// has as many names as it has blocks.
List<String> _namesFor(String source, Map<String, String> attributes, int count) {
  final List<String> given = (attributes['tabs'] ?? '')
      .split(',')
      .map((String name) => name.trim())
      .where((String name) => name.isNotEmpty)
      .toList();
  final List<String> named = _namesIn(source);

  return List<String>.generate(count, (int at) {
    if (at < given.length) {
      return given[at];
    }

    return at < named.length && named[at].isNotEmpty ? named[at] : '${at + 1}';
  });
}

/// The tabs a [MawyDirectiveBuilder] draws. See the library's own comment.
///
/// One tab in the traversal and the arrows between them, `Home` and `End` to
/// the ends, which is [MawyRoving] — the same focus model the toolbars use.
/// Only the chosen block is built, so what the screen holds is what a reader
/// can see.
class MawyCodeGroup extends StatefulWidget {
  /// Draws [directive]'s blocks as tabs.
  const MawyCodeGroup({required this.tokens, required this.directive, super.key});

  /// The palette, which is the viewer's rather than this widget's to choose.
  final MawyTokens tokens;

  /// The directive, as the builder was handed it.
  final MawyDirective directive;

  @override
  State<MawyCodeGroup> createState() => _MawyCodeGroupState();
}

class _MawyCodeGroupState extends State<MawyCodeGroup> {
  final MawyRoving _roving = MawyRoving();
  int _at = 0;

  @override
  void dispose() {
    _roving.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> blocks = widget.directive.children ?? const <Widget>[];

    if (blocks.isEmpty) {
      return const SizedBox.shrink();
    }

    // A group that named itself is one answer written out — `::: lang js` is
    // the JavaScript of it, prose and code together — so the whole of it is one
    // tab under that name. A group that named nothing is a tab per block, which
    // is what `::: code-group` around three fences means.
    final InlineSpan? titled = widget.directive.label;
    final List<List<Widget>> panels = titled != null
        ? <List<Widget>>[blocks]
        : blocks.map((Widget block) => <Widget>[block]).toList();
    final List<String> names = titled != null
        ? const <String>['']
        : _namesFor(widget.directive.source, widget.directive.attributes, blocks.length);
    // A group whose blocks changed under a chosen tab keeps a number it no
    // longer has, and a panel nobody can see.
    final int chosen = _at.clamp(0, panels.length - 1);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: widget.tokens.border),
        borderRadius: BorderRadius.circular(10),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          ColoredBox(
            // A shade off the code under it, so the row of names reads as the
            // chrome it is rather than as the first line of the block.
            color:
                Color.lerp(widget.tokens.codeBackground, widget.tokens.border, 0.28) ??
                widget.tokens.codeBackground,
            child: MawyRovingRow(
              roving: _roving,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                child: Row(
                  children: <Widget>[
                    for (int at = 0; at < names.length; at += 1)
                      _Tab(
                        tokens: widget.tokens,
                        focusNode: _roving.nodeFor(at),
                        chosen: at == chosen,
                        label: titled ?? TextSpan(text: names[at]),
                        onPressed: () => setState(() => _at = at),
                      ),
                  ],
                ),
              ),
            ),
          ),
          // Prose in a group is a paragraph in a box and wants the padding a box
          // gives its words; a code block brings its own and needs none. And
          // everything in here is told that the box is already drawn, so a
          // block inside stops drawing one of its own. See [MawyInsideBox].
          MawyInsideBox(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                for (final Widget block in panels[chosen])
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: panels[chosen].length > 1 ? 14 : 0),
                    child: block,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One name in the row, with the accent under it while its block is showing.
class _Tab extends StatelessWidget {
  const _Tab({
    required this.tokens,
    required this.focusNode,
    required this.chosen,
    required this.label,
    required this.onPressed,
  });

  final MawyTokens tokens;
  final FocusNode focusNode;
  final bool chosen;
  final InlineSpan label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      inMutuallyExclusiveGroup: true,
      selected: chosen,
      button: true,
      child: FocusableActionDetector(
        focusNode: focusNode,
        mouseCursor: SystemMouseCursors.click,
        shortcuts: mawyActivate,
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              onPressed();

              return null;
            },
          ),
        },
        child: GestureDetector(
          onTap: onPressed,
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.fromLTRB(10, 7, 10, 5),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  width: 2,
                  color: chosen ? tokens.accent : const Color(0x00000000),
                ),
              ),
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(
                color: chosen ? tokens.foreground : tokens.foregroundMuted,
                fontSize: 12,
                height: 1.4,
              ),
              child: Text.rich(label),
            ),
          ),
        ),
      ),
    );
  }
}
