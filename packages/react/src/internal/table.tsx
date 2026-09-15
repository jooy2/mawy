'use client';

/**
 * The two ways a table is made and reshaped with a pointer.
 *
 * Making one is a question about its size and nothing else, so the toolbar's
 * `table` button opens a grid to answer it with. Reshaping one is only a
 * question while the caret is in a table, so the controls for it are hung
 * beside the table the caret is in rather than kept in a menu that has nothing
 * to act on everywhere else. The keys for all of it are in `MawyEditor.tsx`.
 */

import * as React from 'react';
import type { MawyTableCommand } from './commands.js';
import { IconButton, useDismiss } from './controls.js';
import { fill, type MawyStrings } from './i18n.js';
import {
  ColumnAfterIcon,
  ColumnBeforeIcon,
  RemoveIcon,
  RowAboveIcon,
  RowBelowIcon
} from './icons.js';

/** How many columns and rows the grid offers, the header counted as a row. */
const GRID_COLUMNS = 10;
const GRID_ROWS = 8;

export interface TableSizeGridProps {
  strings: MawyStrings;
  /** Off where a table has nowhere to go: inside a code block, or another table. */
  disabled?: boolean;
  onPick: (columns: number, rows: number) => void;
}

/**
 * A grid of cells, lit from the corner to the one under the pointer, that
 * inserts a table of the size lit.
 *
 * Buttons rather than a picture of a grid with a pointer handler, so each size
 * is something a keyboard can stop on and a screen reader can name. One of
 * them is a tab stop and the arrows move it, which is eighty buttons behind a
 * single `Tab`; `Enter` inserts what is lit.
 */
export function TableSizeGrid({
  strings,
  disabled,
  onPick
}: TableSizeGridProps): React.ReactElement {
  const dismiss = useDismiss();
  const [size, setSize] = React.useState({ columns: 2, rows: 2 });
  const cells = React.useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { columns, rows } = size;
    const next =
      event.key === 'ArrowRight'
        ? { columns: Math.min(GRID_COLUMNS, columns + 1), rows }
        : event.key === 'ArrowLeft'
          ? { columns: Math.max(1, columns - 1), rows }
          : event.key === 'ArrowDown'
            ? { columns, rows: Math.min(GRID_ROWS, rows + 1) }
            : event.key === 'ArrowUp'
              ? { columns, rows: Math.max(1, rows - 1) }
              : event.key === 'Home'
                ? { columns: 1, rows: 1 }
                : event.key === 'End'
                  ? { columns: GRID_COLUMNS, rows: GRID_ROWS }
                  : null;

    if (!next) {
      return;
    }

    event.preventDefault();
    setSize(next);
    cells.current
      ?.querySelector<HTMLButtonElement>(`[data-mawy-cell="${next.columns},${next.rows}"]`)
      ?.focus();
  };

  const sizes = Array.from({ length: GRID_ROWS * GRID_COLUMNS }, (_, index) => ({
    columns: (index % GRID_COLUMNS) + 1,
    rows: Math.floor(index / GRID_COLUMNS) + 1
  }));

  return (
    <div className="mawy-table-grid" role="group" aria-label={strings.tableInsert}>
      <div
        className="mawy-table-grid-cells"
        ref={cells}
        onKeyDown={onKeyDown}
        style={{ '--mawy-grid-columns': GRID_COLUMNS } as React.CSSProperties}
      >
        {sizes.map(({ columns, rows }) => (
          <button
            key={`${columns},${rows}`}
            type="button"
            className="mawy-table-grid-cell"
            data-mawy-cell={`${columns},${rows}`}
            data-mawy-lit={(columns <= size.columns && rows <= size.rows) || undefined}
            aria-label={fill(strings.tableInsertSized, { C: String(columns), R: String(rows) })}
            tabIndex={columns === size.columns && rows === size.rows ? 0 : -1}
            disabled={disabled}
            onPointerEnter={() => setSize({ columns, rows })}
            onFocus={() => setSize({ columns, rows })}
            onClick={() => {
              // Shut first, so the focus the insert gives back to the document
              // is not taken again by the panel closing.
              dismiss?.();
              onPick(columns, rows);
            }}
          />
        ))}
      </div>
      <p className="mawy-table-grid-size" aria-hidden="true">
        {disabled
          ? strings.tableInsert
          : fill(strings.tableSize, { C: String(size.columns), R: String(size.rows) })}
      </p>
    </div>
  );
}

/** What the controls beside a table do, in the order they are drawn, with their keys. */
const TABLE_TOOLS: readonly (
  | {
      command: MawyTableCommand;
      label: keyof MawyStrings;
      icon: typeof RowAboveIcon;
      keys: string;
    }
  | 'separator'
)[] = [
  {
    command: 'addRowAbove',
    label: 'tableRowAbove',
    icon: RowAboveIcon,
    keys: 'Control+Shift+Enter Meta+Shift+Enter'
  },
  {
    command: 'addRowBelow',
    label: 'tableRowBelow',
    icon: RowBelowIcon,
    keys: 'Control+Enter Meta+Enter'
  },
  {
    command: 'removeRow',
    label: 'tableRowRemove',
    icon: RemoveIcon,
    keys: 'Control+Shift+Backspace Meta+Shift+Backspace'
  },
  'separator',
  {
    command: 'addColumnBefore',
    label: 'tableColumnBefore',
    icon: ColumnBeforeIcon,
    keys: 'Control+Alt+Shift+Enter Meta+Alt+Shift+Enter'
  },
  {
    command: 'addColumnAfter',
    label: 'tableColumnAfter',
    icon: ColumnAfterIcon,
    keys: 'Control+Alt+Enter Meta+Alt+Enter'
  },
  {
    command: 'removeColumn',
    label: 'tableColumnRemove',
    icon: RemoveIcon,
    keys: 'Control+Alt+Shift+Backspace Meta+Alt+Shift+Backspace'
  }
];

export interface TableToolsProps {
  strings: MawyStrings;
  /** Where the bar is, from the top and the inline end of the pane it is in. */
  top: number;
  end: number;
  /** Whether a command has anything to act on where the caret is. */
  available: (command: MawyTableCommand) => boolean;
  onCommand: (command: MawyTableCommand) => void;
}

/**
 * The row and column controls, hung beside the table the caret is in.
 *
 * Over the table's top edge at its far end, and under its bottom edge where
 * there is no room above: out of the cells being typed into, and near enough
 * the table to read as its own. A press on the bar does not take the focus, so
 * the caret the command acts on is still in the cell it was in and the next
 * letter goes there. Each button is named in a tooltip and to a screen reader,
 * and each command is also a key, which `aria-keyshortcuts` says.
 */
export const TableTools = React.forwardRef<HTMLDivElement, TableToolsProps>(function TableTools(
  { strings, top, end, available, onCommand },
  ref
) {
  return (
    <div
      ref={ref}
      className="mawy-table-tools"
      role="toolbar"
      aria-label={strings.table}
      lang={strings.lang}
      style={{ top, insetInlineEnd: end }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {TABLE_TOOLS.map((tool, index) =>
        tool === 'separator' ? (
          <span key={index} className="mawy-toolbar-separator" aria-hidden="true" />
        ) : (
          <IconButton
            key={tool.command}
            label={strings[tool.label]}
            icon={<tool.icon className="mawy-icon" aria-hidden="true" />}
            aria-keyshortcuts={tool.keys}
            disabled={!available(tool.command)}
            onClick={() => onCommand(tool.command)}
          />
        )
      )}
    </div>
  );
});
