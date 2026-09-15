/// The two ways a table is made and reshaped with a pointer.
///
/// Making one is a question about its size and nothing else, so the toolbar's
/// `table` item opens a grid to answer it with. Reshaping one is only a
/// question while the caret is in a table, so the controls for it are hung
/// beside the table the caret is in rather than kept in a menu that has
/// nothing to act on everywhere else. The React package's `internal/table.tsx`
/// is the same two, and the keys for all of it are in `source_field.dart`.
library;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/editor/commands.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/toolbar.dart';
import 'package:mawy/src/theme/tokens.dart';

/// How many columns and rows the grid offers, the header counted as a row.
const int _gridColumns = 10;
const int _gridRows = 8;
const double _cell = 18;
const double _gap = 3;

/// A grid of cells, lit from the corner to the one under the pointer, that
/// inserts a table of the size lit.
///
/// One focusable grid rather than eighty focusable cells: the arrows move what
/// is lit and `Enter` inserts it, and a screen reader is given each size as a
/// button of its own to press. The panel opens with the focus in the grid, for
/// the reason `MawyToolbarChoice` gives.
class MawyTableSizeGrid extends StatefulWidget {
  /// Creates the grid.
  const MawyTableSizeGrid({
    required this.tokens,
    required this.strings,
    required this.onPick,
    this.enabled = true,
    super.key,
  });

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// Off where a table has nowhere to go: inside a code block, or another table.
  final bool enabled;

  /// Inserts a table of this many columns and rows, the header among them.
  final void Function(int columns, int rows) onPick;

  @override
  State<MawyTableSizeGrid> createState() => _MawyTableSizeGridState();
}

class _MawyTableSizeGridState extends State<MawyTableSizeGrid> {
  int _columns = 2;
  int _rows = 2;

  String _sized(String words, int columns, int rows) =>
      words.replaceAll('%C', '$columns').replaceAll('%R', '$rows');

  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }

    final LogicalKeyboardKey key = event.logicalKey;

    if (key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.numpadEnter ||
        key == LogicalKeyboardKey.space) {
      widget.onPick(_columns, _rows);

      return KeyEventResult.handled;
    }

    final (int, int)? next = switch (key) {
      LogicalKeyboardKey.arrowRight => (_columns < _gridColumns ? _columns + 1 : _columns, _rows),
      LogicalKeyboardKey.arrowLeft => (_columns > 1 ? _columns - 1 : 1, _rows),
      LogicalKeyboardKey.arrowDown => (_columns, _rows < _gridRows ? _rows + 1 : _rows),
      LogicalKeyboardKey.arrowUp => (_columns, _rows > 1 ? _rows - 1 : 1),
      LogicalKeyboardKey.home => (1, 1),
      LogicalKeyboardKey.end => (_gridColumns, _gridRows),
      _ => null,
    };

    if (next == null) {
      return KeyEventResult.ignored;
    }

    setState(() {
      _columns = next.$1;
      _rows = next.$2;
    });

    return KeyEventResult.handled;
  }

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;

    return Focus(
      autofocus: widget.enabled,
      canRequestFocus: widget.enabled,
      onKeyEvent: _onKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: 6,
        children: <Widget>[
          Column(
            mainAxisSize: MainAxisSize.min,
            spacing: _gap,
            children: <Widget>[
              for (int rows = 1; rows <= _gridRows; rows += 1)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  spacing: _gap,
                  children: <Widget>[
                    for (int columns = 1; columns <= _gridColumns; columns += 1)
                      _cellFor(tokens, columns, rows),
                  ],
                ),
            ],
          ),
          ExcludeSemantics(
            child: Text(
              widget.enabled
                  ? _sized(widget.strings.tableSize, _columns, _rows)
                  : widget.strings.tableInsert,
              style: TextStyle(color: tokens.foregroundMuted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _cellFor(MawyTokens tokens, int columns, int rows) {
    final bool lit = widget.enabled && columns <= _columns && rows <= _rows;

    return Semantics(
      button: true,
      enabled: widget.enabled,
      label: _sized(widget.strings.tableInsertSized, columns, rows),
      onTap: widget.enabled ? () => widget.onPick(columns, rows) : null,
      child: MouseRegion(
        cursor: widget.enabled ? SystemMouseCursors.click : MouseCursor.defer,
        onEnter: widget.enabled
            ? (PointerEnterEvent _) => setState(() {
                _columns = columns;
                _rows = rows;
              })
            : null,
        child: GestureDetector(
          onTap: widget.enabled ? () => widget.onPick(columns, rows) : null,
          child: Container(
            width: _cell,
            height: _cell,
            decoration: BoxDecoration(
              color: lit ? tokens.accentSoft : tokens.background,
              borderRadius: BorderRadius.circular(3),
              border: Border.all(
                color: lit
                    ? tokens.accent
                    : tokens.borderStrong.withValues(alpha: widget.enabled ? 1 : 0.4),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// How tall the bar beside a table is, which is what placing it is measured against.
const double kMawyTableToolsHeight = 36;

/// The row and column controls, hung beside the table the caret is in.
///
/// A press on one does not take the focus from the source, so the caret the
/// command acts on is still in the cell it was in. Each is named in a tooltip
/// and to a screen reader, and each command is also a key.
class MawyTableTools extends StatelessWidget {
  /// Creates the bar.
  const MawyTableTools({
    required this.tokens,
    required this.strings,
    required this.available,
    required this.onCommand,
    this.rows = 1,
    this.columns = 1,
    super.key,
  });

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// Whether a command has anything to act on where the caret is.
  final bool Function(MawyTableCommand) available;

  /// Runs one.
  final ValueChanged<MawyTableCommand> onCommand;

  /// How many rows and columns the selection covers, one each for a caret.
  ///
  /// Each command acts on that many and says so, and a selection over more
  /// than one cell has one more control, which empties them.
  final int rows;

  /// How many columns the selection covers. See [rows].
  final int columns;

  @override
  Widget build(BuildContext context) {
    Widget button(MawyTableCommand command, IconData icon, String label) => MawyToolbarButton(
      icon: icon,
      label: label,
      tokens: tokens,
      enabled: available(command),
      onPressed: () => onCommand(command),
    );
    String counted(String one, String many, int count) =>
        count > 1 ? many.replaceAll('%N', '$count') : one;
    Widget rule() => Container(
      width: 1,
      height: 18,
      margin: const EdgeInsets.symmetric(horizontal: 3),
      color: tokens.border,
    );

    return Semantics(
      container: true,
      explicitChildNodes: true,
      child: Container(
        height: kMawyTableToolsHeight,
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          color: tokens.backgroundRaised,
          borderRadius: BorderRadius.circular(MawyRadius.medium),
          border: Border.all(color: tokens.border),
          boxShadow: <BoxShadow>[
            BoxShadow(
              color: const Color(0xFF101018).withValues(alpha: 0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            button(
              MawyTableCommand.addRowAbove,
              LucideIcons.betweenHorizontalStart,
              counted(strings.tableRowAbove, strings.tableRowsAbove, rows),
            ),
            button(
              MawyTableCommand.addRowBelow,
              LucideIcons.betweenHorizontalEnd,
              counted(strings.tableRowBelow, strings.tableRowsBelow, rows),
            ),
            button(
              MawyTableCommand.removeRow,
              LucideIcons.trash2,
              counted(strings.tableRowRemove, strings.tableRowsRemove, rows),
            ),
            rule(),
            button(
              MawyTableCommand.addColumnBefore,
              LucideIcons.betweenVerticalStart,
              counted(strings.tableColumnBefore, strings.tableColumnsBefore, columns),
            ),
            button(
              MawyTableCommand.addColumnAfter,
              LucideIcons.betweenVerticalEnd,
              counted(strings.tableColumnAfter, strings.tableColumnsAfter, columns),
            ),
            button(
              MawyTableCommand.removeColumn,
              LucideIcons.trash2,
              counted(strings.tableColumnRemove, strings.tableColumnsRemove, columns),
            ),
            if (rows * columns > 1) ...<Widget>[
              rule(),
              button(MawyTableCommand.clearCells, LucideIcons.eraser, strings.tableCellsClear),
            ],
          ],
        ),
      ),
    );
  }
}
