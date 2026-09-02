'use client';

/**
 * The three controls the chrome is built out of.
 *
 * Small on purpose. A viewer's toolbar needs a button, a button that opens a
 * panel, and two ways of choosing a value — and every one of those has an
 * accessible native element under it here rather than a `div` with handlers.
 * The menu is the only one with any behaviour of its own, and all of it is the
 * three things a panel has to do: shut on Escape, shut on a click elsewhere,
 * and give the focus back to the button it came from.
 */

import * as React from 'react';
import { ChevronDownIcon } from './icons.js';

export interface IconButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  label: string;
  icon: React.ReactNode;
  /** Drawn as held down — a toggle that is on, a menu that is open. */
  pressed?: boolean;
  text?: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, pressed, text, className, ...rest },
  ref
) {
  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={['mawy-button', text ? 'mawy-button-labelled' : '', className]
        .filter(Boolean)
        .join(' ')}
      // A label rather than a `title` alone: a tooltip is not read out, and
      // an icon with nothing else in it is a button with no name.
      aria-label={text ? undefined : label}
      title={label}
      data-mawy-pressed={pressed ? 'true' : undefined}
    >
      {icon}
      {text ? <span className="mawy-button-text">{text}</span> : null}
    </button>
  );
});

export interface MenuProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  tabIndex?: number;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
}

/**
 * How something inside a panel shuts the panel it is in.
 *
 * A `Choice` is a value being picked, and picking one is the end of what the
 * panel was opened for — so it closes, the way a menu does everywhere else. A
 * `Slider` is not: a size is arrived at by moving it, and a panel that shut on
 * the first step would have to be reopened for the second.
 *
 * Through a context rather than a prop, because the thing that has to close is
 * the panel and the thing that knows a value was picked is two elements further
 * in. It is the callback the Flutter package's `builder` is handed, said in the
 * way React says that.
 */
const Dismiss = React.createContext<(() => void) | null>(null);

/**
 * A button and the panel it opens.
 *
 * The panel is placed by measuring: it is left-aligned with its button until
 * that would run it off the right of the viewer, and then it is right-aligned
 * instead. Which sounds like something CSS should do, and is not something CSS
 * can do — `anchor-position` is not everywhere yet, and a panel that is simply
 * clipped is a control the last two buttons on a toolbar do not have.
 */
export const Menu = React.forwardRef<HTMLButtonElement, MenuProps>(function Menu(
  { label, icon, children, tabIndex, onFocus },
  ref
) {
  const [open, setOpen] = React.useState(false);
  const [align, setAlign] = React.useState<'start' | 'end'>('start');
  const wrapper = React.useRef<HTMLDivElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const button = React.useRef<HTMLButtonElement>(null);

  /** Shut, with the focus put back on the button the panel came from. */
  const close = React.useCallback(() => {
    setOpen(false);
    button.current?.focus();
  }, []);

  React.useImperativeHandle(ref, () => button.current as HTMLButtonElement);

  React.useLayoutEffect(() => {
    if (!open || !panel.current || !wrapper.current) {
      return;
    }

    const box = panel.current.getBoundingClientRect();
    const edge = wrapper.current.closest('.mawy-root')?.getBoundingClientRect();

    setAlign(edge && box.right > edge.right - 8 ? 'end' : 'start');
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  return (
    <div className="mawy-menu" ref={wrapper}>
      <IconButton
        ref={button}
        label={label}
        icon={icon}
        pressed={open}
        tabIndex={tabIndex}
        onFocus={onFocus}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-mawy-toolbar-item=""
        onClick={() => setOpen((was) => !was)}
      />
      {open ? (
        <div
          ref={panel}
          className="mawy-menu-panel"
          role="dialog"
          aria-label={label}
          data-mawy-align={align}
        >
          <Dismiss.Provider value={close}>{children}</Dismiss.Provider>
        </div>
      ) : null}
    </div>
  );
});

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  /** For an option that has to be shown as the thing it selects — a typeface. */
  style?: React.CSSProperties;
}

export interface ChoiceProps<T extends string> {
  label: string;
  value: T;
  options: readonly ChoiceOption<T>[];
  onChange: (next: T) => void;
}

/**
 * One of a few named values, as a radio group that looks like a list.
 *
 * Picking one shuts the panel it is in, where it is in one. That is what a menu
 * does, and a panel still open over the thing it has just changed is a panel
 * hiding the answer to the question it was asked.
 */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange
}: ChoiceProps<T>): React.ReactElement {
  const dismiss = React.useContext(Dismiss);

  return (
    <div className="mawy-choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          className="mawy-choice-option"
          aria-checked={option.value === value}
          style={option.style}
          onClick={() => {
            onChange(option.value);
            dismiss?.();
          }}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** What the number reads as — `1.7`, `16px`. */
  format: (value: number) => string;
  onChange: (next: number) => void;
  /** Offered only while the value is not the one it started at. */
  resetLabel?: string;
  onReset?: () => void;
  atDefault?: boolean;
}

/**
 * A number between two others.
 *
 * A native `range`, which already knows about arrow keys, Home and End, and
 * announces itself with its value. Nothing here is drawn by hand; the styling
 * is CSS on the real element.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  resetLabel,
  onReset,
  atDefault
}: SliderProps): React.ReactElement {
  const id = React.useId();

  return (
    <div className="mawy-slider">
      <label className="mawy-slider-label" htmlFor={id}>
        <span>{label}</span>
        <output htmlFor={id}>{format(value)}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      {onReset && resetLabel ? (
        <button
          type="button"
          className="mawy-slider-reset"
          onClick={onReset}
          // Present but inert at the default, so the panel does not change
          // height the moment a slider is touched.
          disabled={atDefault}
        >
          {resetLabel}
        </button>
      ) : null}
    </div>
  );
}

/** The caret a menu button carries, so a reader knows it opens something. */
export function MenuCaret(): React.ReactElement {
  return <ChevronDownIcon className="mawy-icon mawy-caret" aria-hidden="true" />;
}
