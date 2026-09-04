/// The toolbar: how the document is set, not what it says.
///
/// Every control here is about the reading rather than about the writing —
/// typeface, size, line height, letter spacing, column width, theme — which is
/// the whole reason a read-only viewer has a toolbar at all. It is the React
/// package's toolbar, control for control and icon for icon: the glyphs are
/// Lucide's in both, so the two are the same toolbar rather than two toolbars
/// that resemble each other.
///
/// Built on `package:flutter/widgets.dart`, with the menus put up through an
/// [Overlay] — the application's where it has one, and the component's own
/// where it has not. Material would have been less code and would have brought
/// its own palette, its own ripple and its own sizes into a viewer that has all
/// three of its own.
library;

import 'dart:math' as math;

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/copying.dart';
import 'package:mawy/src/internal/focus_visible.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/internal/toolbar.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

/// How far each of the three numbers may be moved, and by how much.
///
/// The React package's own numbers. A reader who set a document to 22px there
/// and opens the same document here should not find a different scale.
abstract final class MawyTypographyRange {
  /// The smallest, largest and step of the body size, in logical pixels.
  static const (double, double, double) fontSize = (13, 26, 1);

  /// The same for the line height, which is unitless.
  static const (double, double, double) lineHeight = (1.3, 2.4, 0.05);

  /// The same for the letter spacing, in ems.
  static const (double, double, double) letterSpacing = (-0.04, 0.16, 0.005);
}

/// The bar across the top of a viewer.
///
/// One tab stop for the whole row, and the arrows move between the controls
/// inside it — see [MawyRoving], which is where that lives because there are
/// two toolbars in this package and only one focus model.
class MawyViewerToolbar extends StatefulWidget {
  /// Creates a toolbar.
  const MawyViewerToolbar({
    required this.items,
    required this.tokens,
    required this.strings,
    required this.typography,
    required this.onTypographyChange,
    required this.colorScheme,
    required this.onColorSchemeChange,
    required this.outlineOpen,
    required this.onOutlineToggle,
    required this.copyState,
    required this.onCopy,
    required this.finding,
    this.onFind,
    super.key,
  });

  /// Which controls to draw, in order.
  final List<MawyViewerToolbarItem> items;

  /// The palette.
  final MawyTokens tokens;

  /// The library's own words.
  final MawyStrings strings;

  /// How the document is currently set.
  final MawyTypography typography;

  /// Called with whatever the reader chose.
  final ValueChanged<MawyTypography> onTypographyChange;

  /// Which palette the viewer was told to draw in.
  final MawyColorScheme colorScheme;

  /// Called when the reader changes it. The control is not drawn without one.
  final ValueChanged<MawyColorScheme>? onColorSchemeChange;

  /// Whether the outline panel is showing.
  final bool outlineOpen;

  /// Called when the outline button is pressed.
  final VoidCallback onOutlineToggle;

  /// Whether the find bar is open.
  final bool finding;

  /// Opens it. Absent where there is nothing to search; the button goes quiet.
  final VoidCallback? onFind;

  /// What the copy button has just done, which is what its label reads.
  final MawyCopyState copyState;

  /// Called when the copy button is pressed.
  final VoidCallback onCopy;

  @override
  State<MawyViewerToolbar> createState() => _MawyViewerToolbarState();
}

class _MawyViewerToolbarState extends State<MawyViewerToolbar> {
  final MawyRoving _roving = MawyRoving();

  @override
  void dispose() {
    _roving.dispose();
    super.dispose();
  }

  IconData get _schemeIcon => switch (widget.colorScheme) {
    MawyColorScheme.light => LucideIcons.sun,
    MawyColorScheme.dark => LucideIcons.moon,
    MawyColorScheme.system => LucideIcons.sunMoon,
  };

  @override
  Widget build(BuildContext context) {
    final List<Widget> drawn = <Widget>[];

    // The row's places, counted over the controls rather than over the items:
    // a separator is drawn and is not somewhere the focus goes, and a control
    // the viewer decided not to draw takes no place either.
    int stop = 0;

    for (final MawyViewerToolbarItem item in widget.items) {
      final Widget? control = _control(item, _roving.nodeFor(stop));

      if (control == null) {
        continue;
      }

      drawn.add(control);

      if (item != MawyViewerToolbarItem.separator) {
        stop += 1;
      }
    }

    return Semantics(
      container: true,
      label: widget.strings.toolbar,
      child: Container(
        decoration: BoxDecoration(
          color: widget.tokens.chrome,
          border: Border(bottom: BorderSide(color: widget.tokens.border)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: MawyRovingRow(
          roving: _roving,
          child: Row(mainAxisAlignment: MainAxisAlignment.end, children: drawn),
        ),
      ),
    );
  }

  Widget? _control(MawyViewerToolbarItem item, FocusNode node) {
    switch (item) {
      case MawyViewerToolbarItem.separator:
        return Container(
          width: 1,
          height: 18,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          color: widget.tokens.border,
        );

      case MawyViewerToolbarItem.fontFamily:
        return MawyToolbarMenu(
          icon: LucideIcons.type,
          label: widget.strings.fontFamily,
          tokens: widget.tokens,
          focusNode: node,
          builder: (VoidCallback close) => MawyToolbarChoice<MawyFontFamily>(
            tokens: widget.tokens,
            value: widget.typography.fontFamily,
            // Each one read in the typeface it names, which is the React
            // package's list: what a typeface is cannot be said in words, and a
            // glyph beside it would say less than the word already does.
            options: <MawyToolbarOption<MawyFontFamily>>[
              MawyToolbarOption<MawyFontFamily>(
                MawyFontFamily.sans,
                widget.strings.fontFamilySans,
                style: const TextStyle(fontFamilyFallback: <String>['Pretendard', 'Noto Sans KR']),
              ),
              MawyToolbarOption<MawyFontFamily>(
                MawyFontFamily.serif,
                widget.strings.fontFamilySerif,
                style: const TextStyle(fontFamilyFallback: <String>['Georgia', 'Noto Serif KR']),
              ),
              MawyToolbarOption<MawyFontFamily>(
                MawyFontFamily.mono,
                widget.strings.fontFamilyMono,
                style: const TextStyle(
                  fontFamilyFallback: <String>['Menlo', 'Consolas', 'Roboto Mono'],
                ),
              ),
            ],
            onChanged: (MawyFontFamily next) {
              widget.onTypographyChange(widget.typography.copyWith(fontFamily: next));
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.fontSize:
        return _slider(
          node: node,
          icon: LucideIcons.aLargeSmall,
          label: widget.strings.fontSize,
          range: MawyTypographyRange.fontSize,
          value: widget.typography.fontSize,
          fallback: const MawyTypography().fontSize,
          format: (double value) => '${value.round()}px',
          apply: (double next) =>
              widget.onTypographyChange(widget.typography.copyWith(fontSize: next)),
        );

      case MawyViewerToolbarItem.lineHeight:
        return _slider(
          node: node,
          icon: LucideIcons.unfoldVertical,
          label: widget.strings.lineHeight,
          range: MawyTypographyRange.lineHeight,
          value: widget.typography.lineHeight,
          fallback: const MawyTypography().lineHeight,
          format: (double value) => value.toStringAsFixed(2),
          apply: (double next) =>
              widget.onTypographyChange(widget.typography.copyWith(lineHeight: next)),
        );

      case MawyViewerToolbarItem.letterSpacing:
        return _slider(
          node: node,
          icon: LucideIcons.unfoldHorizontal,
          label: widget.strings.letterSpacing,
          range: MawyTypographyRange.letterSpacing,
          value: widget.typography.letterSpacing,
          fallback: const MawyTypography().letterSpacing,
          format: (double value) => '${value > 0 ? '+' : ''}${value.toStringAsFixed(3)}em',
          apply: (double next) =>
              widget.onTypographyChange(widget.typography.copyWith(letterSpacing: next)),
        );

      case MawyViewerToolbarItem.measure:
        return MawyToolbarMenu(
          icon: LucideIcons.stretchHorizontal,
          label: widget.strings.measure,
          tokens: widget.tokens,
          focusNode: node,
          builder: (VoidCallback close) => MawyToolbarChoice<MawyMeasure>(
            tokens: widget.tokens,
            value: widget.typography.measure,
            // No glyphs, because the React package's list has none: four names
            // for four widths, and a picture of a width is not a thing.
            options: <MawyToolbarOption<MawyMeasure>>[
              MawyToolbarOption<MawyMeasure>(MawyMeasure.narrow, widget.strings.measureNarrow),
              MawyToolbarOption<MawyMeasure>(MawyMeasure.normal, widget.strings.measureNormal),
              MawyToolbarOption<MawyMeasure>(MawyMeasure.wide, widget.strings.measureWide),
              MawyToolbarOption<MawyMeasure>(MawyMeasure.full, widget.strings.measureFull),
            ],
            onChanged: (MawyMeasure next) {
              widget.onTypographyChange(widget.typography.copyWith(measure: next));
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.colorScheme:
        final ValueChanged<MawyColorScheme>? change = widget.onColorSchemeChange;

        // A control that cannot change anything is a control that should not be
        // drawn: the scheme belongs to whoever passed it.
        if (change == null) {
          return null;
        }

        return MawyToolbarMenu(
          icon: _schemeIcon,
          label: widget.strings.colorScheme,
          tokens: widget.tokens,
          focusNode: node,
          builder: (VoidCallback close) => MawyToolbarChoice<MawyColorScheme>(
            tokens: widget.tokens,
            value: widget.colorScheme,
            options: MawyToolbarSchemes.of(widget.strings),
            onChanged: (MawyColorScheme next) {
              change(next);
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.outline:
        return MawyToolbarButton(
          icon: LucideIcons.listTree,
          label: widget.strings.outline,
          tokens: widget.tokens,
          focusNode: node,
          pressed: widget.outlineOpen,
          onPressed: widget.onOutlineToggle,
        );

      case MawyViewerToolbarItem.find:
        return MawyToolbarButton(
          icon: LucideIcons.search,
          label: widget.strings.find,
          tokens: widget.tokens,
          focusNode: node,
          enabled: widget.onFind != null,
          pressed: widget.finding,
          onPressed: widget.onFind ?? () {},
        );

      case MawyViewerToolbarItem.copy:
        return MawyToolbarButton(
          icon: switch (widget.copyState) {
            MawyCopyState.copied => LucideIcons.check,
            MawyCopyState.failed => LucideIcons.x,
            MawyCopyState.idle => LucideIcons.copy,
          },
          label: switch (widget.copyState) {
            MawyCopyState.copied => widget.strings.copied,
            MawyCopyState.failed => widget.strings.copyFailed,
            MawyCopyState.idle => widget.strings.copy,
          },
          tokens: widget.tokens,
          focusNode: node,
          pressed: widget.copyState == MawyCopyState.copied,
          onPressed: widget.onCopy,
        );
    }
  }

  Widget _slider({
    required FocusNode node,
    required IconData icon,
    required String label,
    required (double, double, double) range,
    required double value,
    required double fallback,
    required String Function(double) format,
    required ValueChanged<double> apply,
  }) {
    return MawyToolbarMenu(
      icon: icon,
      label: label,
      tokens: widget.tokens,
      focusNode: node,
      builder: (VoidCallback close) => _Slider(
        tokens: widget.tokens,
        label: label,
        resetLabel: widget.strings.reset,
        range: range,
        value: value,
        fallback: fallback,
        format: format,
        onChanged: apply,
      ),
    );
  }
}

/// One number, with a track to drag and a way back to where it started.
class _Slider extends StatelessWidget {
  const _Slider({
    required this.tokens,
    required this.label,
    required this.resetLabel,
    required this.range,
    required this.value,
    required this.fallback,
    required this.format,
    required this.onChanged,
  });

  final MawyTokens tokens;
  final String label;
  final String resetLabel;
  final (double, double, double) range;
  final double value;
  final double fallback;
  final String Function(double) format;
  final ValueChanged<double> onChanged;

  @override
  Widget build(BuildContext context) {
    final (double min, double max, double step) = range;
    final double clamped = value.clamp(min, max);

    void move(int steps) {
      final double next = ((clamped + steps * step) / step).round() * step;

      onChanged(next.clamp(min, max));
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(4, 2, 4, 8),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(label, style: TextStyle(color: tokens.foregroundMuted, fontSize: 12)),
              ),
              Text(
                format(clamped),
                style: TextStyle(
                  color: tokens.foreground,
                  fontSize: 12,
                  fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
        Row(
          children: <Widget>[
            MawyToolbarButton(
              icon: LucideIcons.minus,
              label: '$label −',
              tokens: tokens,
              // The panel opens with the focus already in it — see _Choice.
              // A slider's first control is the one that takes a step down.
              autofocus: true,
              onPressed: () => move(-1),
            ),
            Expanded(
              child: Semantics(
                slider: true,
                label: label,
                value: format(clamped),
                child: _Track(
                  tokens: tokens,
                  fraction: (clamped - min) / (max - min),
                  onFraction: (double fraction) {
                    final double raw = min + fraction * (max - min);

                    onChanged(((raw / step).round() * step).clamp(min, max));
                  },
                ),
              ),
            ),
            MawyToolbarButton(
              icon: LucideIcons.plus,
              label: '$label +',
              tokens: tokens,
              onPressed: () => move(1),
            ),
          ],
        ),
        // Present at the default and inert there, so the panel does not change
        // height the moment a slider is touched. The React package's is the
        // same word under the same rule.
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: _Reset(
            tokens: tokens,
            label: resetLabel,
            enabled: clamped != fallback,
            onPressed: () => onChanged(fallback),
          ),
        ),
      ],
    );
  }
}

/// The way back to where a slider started.
///
/// A word rather than a button, and still a control: it is in the panel, so it
/// is somewhere Tab arrives, and a control the keyboard can reach and not press
/// is worse than one it cannot reach at all.
class _Reset extends StatefulWidget {
  const _Reset({
    required this.tokens,
    required this.label,
    required this.enabled,
    required this.onPressed,
  });

  final MawyTokens tokens;
  final String label;
  final bool enabled;
  final VoidCallback onPressed;

  @override
  State<_Reset> createState() => _ResetState();
}

class _ResetState extends State<_Reset> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: widget.label,
      child: FocusableActionDetector(
        enabled: widget.enabled,
        mouseCursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
        shortcuts: const <ShortcutActivator, Intent>{
          SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.numpadEnter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
        },
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              widget.onPressed();

              return null;
            },
          ),
        },
        onShowFocusHighlight: (bool on) => setState(() => _focused = on && MawyFocusVisible.wanted),
        child: GestureDetector(
          onTap: widget.enabled ? widget.onPressed : null,
          child: Text(
            widget.label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: widget.enabled ? widget.tokens.accent : widget.tokens.foregroundSubtle,
              fontSize: 12,
              decoration: _focused ? TextDecoration.underline : null,
              decorationColor: widget.tokens.accent,
            ),
          ),
        ),
      ),
    );
  }
}

/// How wide the thumb is, and so how much of the track its centre cannot reach.
const double _thumb = 14;

class _Track extends StatelessWidget {
  const _Track({required this.tokens, required this.fraction, required this.onFraction});

  final MawyTokens tokens;
  final double fraction;
  final ValueChanged<double> onFraction;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        // Measured over the run the thumb's centre actually travels, which is
        // the track less the thumb: a pointer at the far right is the maximum
        // rather than a little short of it.
        final double run = math.max(constraints.maxWidth - _thumb, 1);
        final double at = fraction.clamp(0, 1);

        void to(Offset local) => onFraction(((local.dx - _thumb / 2) / run).clamp(0, 1));

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (TapDownDetails details) => to(details.localPosition),
          onHorizontalDragUpdate: (DragUpdateDetails details) => to(details.localPosition),
          child: SizedBox(
            height: 30,
            child: Center(
              child: SizedBox(
                height: _thumb,
                child: Stack(
                  alignment: Alignment.centerLeft,
                  children: <Widget>[
                    Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: tokens.border,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    FractionallySizedBox(
                      widthFactor: at,
                      child: Container(
                        height: 4,
                        decoration: BoxDecoration(
                          color: tokens.accent,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    // Something to take hold of, which a track without one does
                    // not have: a browser draws a thumb on `input[type=range]`
                    // and a reader who has moved one is looking for it.
                    Positioned(
                      left: at * run,
                      child: Container(
                        width: _thumb,
                        height: _thumb,
                        decoration: BoxDecoration(
                          color: tokens.accent,
                          shape: BoxShape.circle,
                          border: Border.all(color: tokens.backgroundRaised, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
