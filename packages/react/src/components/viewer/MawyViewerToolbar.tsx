'use client';

import * as React from 'react';
import type {
  MawyColorScheme,
  MawyFont,
  MawyFontFamily,
  MawyMeasure,
  MawyTypography,
  MawyViewerToolbarItem
} from '../../types.js';
import type { CopyState } from '../../internal/clipboard.js';
import type { MawyStrings } from '../../internal/i18n.js';
import { Choice, IconButton, Menu, Slider } from '../../internal/controls.js';
import { tabStops, useRoving } from '../../internal/roving.js';
import { DEFAULT_TYPOGRAPHY, TYPOGRAPHY_RANGE } from '../../internal/typography.js';
import { fontStack, loadFontStylesheet } from '../../internal/fonts.js';
import {
  CheckIcon,
  CopyIcon,
  DarkIcon,
  DocumentIcon,
  FindIcon,
  FontFamilyIcon,
  FontSizeIcon,
  LetterSpacingIcon,
  LightIcon,
  LineHeightIcon,
  MeasureIcon,
  OpenFileIcon,
  OutlineIcon,
  SystemThemeIcon
} from '../../internal/icons.js';

/** The label a font is listed under: its own, the locale's, or its id. */
function labelOf(font: MawyFont, strings: MawyStrings): string {
  if (font.label) {
    return font.label;
  }

  const known: Record<string, string> = {
    sans: strings.fontFamilySans,
    serif: strings.fontFamilySerif,
    mono: strings.fontFamilyMono
  };

  return known[font.id] ?? font.id;
}

/**
 * The typefaces on offer, each drawn in itself.
 *
 * A font picker whose names are all set in the same face is a list of words.
 * Which means the web fonts among them have to have arrived — so this fetches
 * them, and it does it here rather than in the viewer because this component is
 * mounted by the menu opening. A reader who never opens it never asks Google
 * Fonts for anything.
 */
function FontChoice({
  strings,
  fonts,
  value,
  onChange
}: {
  strings: MawyStrings;
  fonts: readonly MawyFont[];
  value: MawyFontFamily;
  onChange: (next: MawyFontFamily) => void;
}): React.ReactElement {
  React.useEffect(() => {
    for (const font of fonts) {
      if (font.href) {
        loadFontStylesheet(font.href);
      }
    }
  }, [fonts]);

  return (
    <Choice<MawyFontFamily>
      label={strings.fontFamily}
      value={value}
      onChange={onChange}
      options={fonts.map((font) => ({
        value: font.id,
        label: labelOf(font, strings),
        style: { fontFamily: fontStack(font) }
      }))}
    />
  );
}

export interface MawyViewerToolbarProps {
  items: readonly MawyViewerToolbarItem[];
  strings: MawyStrings;
  typography: MawyTypography;
  onTypographyChange: (next: MawyTypography) => void;
  /** The typefaces on offer, in the order the menu lists them. */
  fonts: readonly MawyFont[];
  colorScheme: MawyColorScheme;
  onColorSchemeChange: (next: MawyColorScheme) => void;
  outlineOpen: boolean;
  onOutlineToggle: () => void;
  /** Absent where nothing can be searched; the button goes quiet. */
  onFind?: () => void;
  finding: boolean;
  /** Absent when a file opened here would go nowhere; the button goes quiet. */
  onOpenFile?: () => void;
  onCopy: () => void;
  copyState: CopyState;
  /** Shown at the head of the toolbar once a file has been opened. */
  fileName: string | null;
  /** Whether there is a document at all; the controls that need one go quiet. */
  hasDocument: boolean;
}

const SCHEME_ICONS: Record<MawyColorScheme, typeof LightIcon> = {
  light: LightIcon,
  dark: DarkIcon,
  system: SystemThemeIcon
};

/**
 * The viewer's toolbar.
 *
 * It is a `toolbar` rather than a row of buttons, which is a real difference
 * and not a spelling: one Tab enters it and one Tab leaves, and the arrow keys
 * move between the controls inside. A reader who is keyboard-only should reach
 * the document in two keystrokes, not in eleven.
 *
 * Every control is either a button or a button that opens a panel, and which of
 * them exist at all is the caller's `toolbar` prop — so an application that
 * wants nothing but a theme switch gets a toolbar with one thing on it rather
 * than a toolbar with nine things it has to hide.
 */
export function MawyViewerToolbar({
  items,
  strings,
  typography,
  onTypographyChange,
  fonts,
  colorScheme,
  onColorSchemeChange,
  outlineOpen,
  onOutlineToggle,
  onFind,
  finding,
  onOpenFile,
  onCopy,
  copyState,
  fileName,
  hasDocument
}: MawyViewerToolbarProps): React.ReactElement {
  const { onKeyDown, itemProps } = useRoving();
  const order = tabStops(items, (item) => (item === 'separator' ? 0 : 1));

  const set = <K extends keyof MawyTypography>(key: K, value: MawyTypography[K]) => {
    onTypographyChange({ ...typography, [key]: value });
  };

  const control = (item: MawyViewerToolbarItem, key: number): React.ReactNode => {
    switch (item) {
      case 'separator':
        return <span key={key} className="mawy-toolbar-separator" aria-hidden="true" />;

      case 'fontFamily':
        return (
          <Menu
            key={key}
            label={strings.fontFamily}
            icon={<FontFamilyIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <FontChoice
              strings={strings}
              fonts={fonts}
              value={typography.fontFamily}
              onChange={(next) => set('fontFamily', next)}
            />
          </Menu>
        );

      case 'fontSize':
        return (
          <Menu
            key={key}
            label={strings.fontSize}
            icon={<FontSizeIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <Slider
              label={strings.fontSize}
              value={typography.fontSize}
              {...TYPOGRAPHY_RANGE.fontSize}
              resetLabel={strings.reset}
              atDefault={typography.fontSize === DEFAULT_TYPOGRAPHY.fontSize}
              onReset={() => set('fontSize', DEFAULT_TYPOGRAPHY.fontSize)}
              format={(value) => `${value}px`}
              onChange={(next) => set('fontSize', next)}
            />
          </Menu>
        );

      case 'lineHeight':
        return (
          <Menu
            key={key}
            label={strings.lineHeight}
            icon={<LineHeightIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <Slider
              label={strings.lineHeight}
              value={typography.lineHeight}
              {...TYPOGRAPHY_RANGE.lineHeight}
              resetLabel={strings.reset}
              atDefault={typography.lineHeight === DEFAULT_TYPOGRAPHY.lineHeight}
              onReset={() => set('lineHeight', DEFAULT_TYPOGRAPHY.lineHeight)}
              format={(value) => value.toFixed(2)}
              onChange={(next) => set('lineHeight', next)}
            />
          </Menu>
        );

      case 'letterSpacing':
        return (
          <Menu
            key={key}
            label={strings.letterSpacing}
            icon={<LetterSpacingIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <Slider
              label={strings.letterSpacing}
              value={typography.letterSpacing}
              {...TYPOGRAPHY_RANGE.letterSpacing}
              resetLabel={strings.reset}
              atDefault={typography.letterSpacing === DEFAULT_TYPOGRAPHY.letterSpacing}
              onReset={() => set('letterSpacing', DEFAULT_TYPOGRAPHY.letterSpacing)}
              format={(value) => `${value > 0 ? '+' : ''}${value.toFixed(3)}em`}
              onChange={(next) => set('letterSpacing', next)}
            />
          </Menu>
        );

      case 'measure':
        return (
          <Menu
            key={key}
            label={strings.measure}
            icon={<MeasureIcon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <Choice<MawyMeasure>
              label={strings.measure}
              value={typography.measure}
              onChange={(next) => set('measure', next)}
              options={[
                { value: 'narrow', label: strings.measureNarrow },
                { value: 'normal', label: strings.measureNormal },
                { value: 'wide', label: strings.measureWide },
                { value: 'full', label: strings.measureFull }
              ]}
            />
          </Menu>
        );

      case 'colorScheme': {
        const Icon = SCHEME_ICONS[colorScheme] ?? SystemThemeIcon;

        return (
          <Menu
            key={key}
            label={strings.colorScheme}
            icon={<Icon className="mawy-icon" aria-hidden="true" />}
            {...itemProps(order[key])}
          >
            <Choice<MawyColorScheme>
              label={strings.colorScheme}
              value={colorScheme}
              onChange={onColorSchemeChange}
              options={[
                {
                  value: 'light',
                  label: strings.colorSchemeLight,
                  icon: <LightIcon className="mawy-icon" aria-hidden="true" />
                },
                {
                  value: 'dark',
                  label: strings.colorSchemeDark,
                  icon: <DarkIcon className="mawy-icon" aria-hidden="true" />
                },
                {
                  value: 'system',
                  label: strings.colorSchemeSystem,
                  icon: <SystemThemeIcon className="mawy-icon" aria-hidden="true" />
                }
              ]}
            />
          </Menu>
        );
      }

      case 'outline':
        return (
          <IconButton
            key={key}
            label={strings.outline}
            icon={<OutlineIcon className="mawy-icon" aria-hidden="true" />}
            pressed={outlineOpen}
            aria-pressed={outlineOpen}
            disabled={!hasDocument}
            data-mawy-toolbar-item=""
            onClick={onOutlineToggle}
            {...itemProps(order[key])}
          />
        );

      case 'find':
        return (
          <IconButton
            key={key}
            label={strings.find}
            icon={<FindIcon className="mawy-icon" aria-hidden="true" />}
            pressed={finding}
            aria-pressed={finding}
            disabled={!onFind || !hasDocument}
            data-mawy-toolbar-item=""
            onClick={onFind}
            {...itemProps(order[key])}
          />
        );

      case 'copy':
        return (
          <IconButton
            key={key}
            label={
              copyState === 'copied'
                ? strings.copied
                : copyState === 'failed'
                  ? strings.copyFailed
                  : strings.copy
            }
            icon={
              copyState === 'copied' ? (
                <CheckIcon className="mawy-icon" aria-hidden="true" />
              ) : (
                <CopyIcon className="mawy-icon" aria-hidden="true" />
              )
            }
            disabled={!hasDocument}
            data-mawy-toolbar-item=""
            data-mawy-state={copyState}
            onClick={onCopy}
            {...itemProps(order[key])}
          />
        );

      case 'open':
        return (
          <IconButton
            key={key}
            label={strings.open}
            icon={<OpenFileIcon className="mawy-icon" aria-hidden="true" />}
            disabled={!onOpenFile}
            data-mawy-toolbar-item=""
            onClick={onOpenFile}
            {...itemProps(order[key])}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="mawy-toolbar" role="toolbar" aria-label={strings.toolbar} onKeyDown={onKeyDown}>
      {fileName ? (
        <p className="mawy-toolbar-title" title={fileName}>
          <DocumentIcon className="mawy-icon" aria-hidden="true" />
          <span>{fileName}</span>
        </p>
      ) : null}
      <div className="mawy-toolbar-controls">{items.map(control)}</div>
    </div>
  );
}

/** Every control, in the order they are drawn when `toolbar` is just `true`. */
export const DEFAULT_TOOLBAR: readonly MawyViewerToolbarItem[] = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'measure',
  'separator',
  'colorScheme',
  'outline',
  'find',
  'separator',
  'copy',
  'open'
];
