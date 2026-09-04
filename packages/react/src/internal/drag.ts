'use client';

import * as React from 'react';

/**
 * A file dragged over a surface, in the four events that takes.
 *
 * Both components do this and both did it the same way, which makes this one
 * place for the two things about it that are not obvious.
 *
 * The first is the counting. Dragging across a child element fires `dragleave`
 * on the parent — the pointer left the parent's own box and entered the child's
 * — so a surface that trusted one `dragleave` would drop its veil the moment
 * the pointer crossed a paragraph. The enters and the leaves are counted
 * instead, and the veil goes when the count reaches nothing.
 *
 * The second is `preventDefault` on `dragover`. Without it the browser handles
 * the drop itself and opens the file, which replaces the page the application
 * was on — so a surface that means to refuse a file still has to say so during
 * the drag rather than ignore it.
 */
export function useFileDrag({
  held,
  taken,
  onDrop
}: {
  /**
   * Whether this drag is one to intercept at all. A run of text dragged across
   * a document is not, and the browser's own handling of that is the right one.
   */
  held: (event: React.DragEvent) => boolean;
  /**
   * Whether letting go here would be taken, which is what the veil says and
   * what the cursor shows. Asked on every event rather than passed as a value,
   * because the answer depends on what the surface is doing at the time.
   */
  taken: () => boolean;
  /** What to do with a file let go of here. */
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
}): {
  /** Whether to draw the veil. */
  dragging: boolean;
  props: Pick<
    React.DOMAttributes<HTMLDivElement>,
    'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'
  >;
} {
  const [dragging, setDragging] = React.useState(false);
  const depth = React.useRef(0);

  return {
    dragging,
    props: {
      onDragEnter: (event) => {
        if (!held(event)) {
          return;
        }

        event.preventDefault();
        depth.current += 1;

        // The veil says "drop to add", so it is only shown where that is true.
        if (taken()) {
          setDragging(true);
        }
      },

      onDragOver: (event) => {
        if (!held(event)) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = taken() ? 'copy' : 'none';
      },

      onDragLeave: () => {
        depth.current = Math.max(depth.current - 1, 0);

        if (depth.current === 0) {
          setDragging(false);
        }
      },

      onDrop: (event) => {
        if (!held(event)) {
          return;
        }

        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        onDrop(event);
      }
    }
  };
}

/** Whether what is being dragged is a file rather than a selection. */
export function carriesFile(event: React.DragEvent): boolean {
  return [...event.dataTransfer.types].includes('Files');
}
