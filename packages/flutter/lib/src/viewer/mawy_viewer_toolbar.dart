/// The toolbar: how the document is set, not what it says.
///
/// Every control here is about the reading rather than about the writing —
/// typeface, size, line height, letter spacing, column width, theme — which is
/// the whole reason a read-only viewer has a toolbar at all. It is the React
/// package's toolbar, control for control and icon for icon: the glyphs are
/// Lucide's in both, so the two are the same toolbar rather than two toolbars
/// that resemble each other.
///
/// Built on `package:flutter/widgets.dart`, with the menus put up through the
/// [Overlay] the application already has. Material would have been less code
/// and would have brought its own palette, its own ripple and its own sizes
/// into a viewer that has all three of its own.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/i18n.dart';
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
class MawyViewerToolbar extends StatelessWidget {
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
    required this.copied,
    required this.onCopy,
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

  /// Whether the copy button has just copied.
  final bool copied;

  /// Called when the copy button is pressed.
  final VoidCallback onCopy;

  IconData get _schemeIcon => switch (colorScheme) {
    MawyColorScheme.light => LucideIcons.sun,
    MawyColorScheme.dark => LucideIcons.moon,
    MawyColorScheme.system => LucideIcons.sunMoon,
  };

  @override
  Widget build(BuildContext context) {
    final List<Widget> drawn = <Widget>[];

    for (final MawyViewerToolbarItem item in items) {
      final Widget? control = _control(item);

      if (control != null) {
        drawn.add(control);
      }
    }

    return Semantics(
      container: true,
      label: strings.toolbar,
      child: Container(
        decoration: BoxDecoration(
          color: tokens.chrome,
          border: Border(bottom: BorderSide(color: tokens.border)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(mainAxisAlignment: MainAxisAlignment.end, children: drawn),
      ),
    );
  }

  Widget? _control(MawyViewerToolbarItem item) {
    switch (item) {
      case MawyViewerToolbarItem.separator:
        return Container(
          width: 1,
          height: 18,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          color: tokens.border,
        );

      case MawyViewerToolbarItem.fontFamily:
        return MawyToolbarMenu(
          icon: LucideIcons.type,
          label: strings.fontFamily,
          tokens: tokens,
          builder: (VoidCallback close) => _Choice<MawyFontFamily>(
            tokens: tokens,
            value: typography.fontFamily,
            options: <(MawyFontFamily, String)>[
              (MawyFontFamily.sans, strings.fontFamilySans),
              (MawyFontFamily.serif, strings.fontFamilySerif),
              (MawyFontFamily.mono, strings.fontFamilyMono),
            ],
            onChanged: (MawyFontFamily next) {
              onTypographyChange(typography.copyWith(fontFamily: next));
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.fontSize:
        return _slider(
          icon: LucideIcons.aLargeSmall,
          label: strings.fontSize,
          range: MawyTypographyRange.fontSize,
          value: typography.fontSize,
          fallback: const MawyTypography().fontSize,
          format: (double value) => '${value.round()}px',
          apply: (double next) => onTypographyChange(typography.copyWith(fontSize: next)),
        );

      case MawyViewerToolbarItem.lineHeight:
        return _slider(
          icon: LucideIcons.unfoldVertical,
          label: strings.lineHeight,
          range: MawyTypographyRange.lineHeight,
          value: typography.lineHeight,
          fallback: const MawyTypography().lineHeight,
          format: (double value) => value.toStringAsFixed(2),
          apply: (double next) => onTypographyChange(typography.copyWith(lineHeight: next)),
        );

      case MawyViewerToolbarItem.letterSpacing:
        return _slider(
          icon: LucideIcons.unfoldHorizontal,
          label: strings.letterSpacing,
          range: MawyTypographyRange.letterSpacing,
          value: typography.letterSpacing,
          fallback: const MawyTypography().letterSpacing,
          format: (double value) => '${value > 0 ? '+' : ''}${value.toStringAsFixed(3)}em',
          apply: (double next) => onTypographyChange(typography.copyWith(letterSpacing: next)),
        );

      case MawyViewerToolbarItem.measure:
        return MawyToolbarMenu(
          icon: LucideIcons.stretchHorizontal,
          label: strings.measure,
          tokens: tokens,
          builder: (VoidCallback close) => _Choice<MawyMeasure>(
            tokens: tokens,
            value: typography.measure,
            options: <(MawyMeasure, String)>[
              (MawyMeasure.narrow, strings.measureNarrow),
              (MawyMeasure.normal, strings.measureNormal),
              (MawyMeasure.wide, strings.measureWide),
              (MawyMeasure.full, strings.measureFull),
            ],
            onChanged: (MawyMeasure next) {
              onTypographyChange(typography.copyWith(measure: next));
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.colorScheme:
        final ValueChanged<MawyColorScheme>? change = onColorSchemeChange;

        // A control that cannot change anything is a control that should not be
        // drawn: the scheme belongs to whoever passed it.
        if (change == null) {
          return null;
        }

        return MawyToolbarMenu(
          icon: _schemeIcon,
          label: strings.colorScheme,
          tokens: tokens,
          builder: (VoidCallback close) => _Choice<MawyColorScheme>(
            tokens: tokens,
            value: colorScheme,
            options: <(MawyColorScheme, String)>[
              (MawyColorScheme.light, strings.colorSchemeLight),
              (MawyColorScheme.dark, strings.colorSchemeDark),
              (MawyColorScheme.system, strings.colorSchemeSystem),
            ],
            onChanged: (MawyColorScheme next) {
              change(next);
              close();
            },
          ),
        );

      case MawyViewerToolbarItem.outline:
        return MawyToolbarButton(
          icon: LucideIcons.listTree,
          label: strings.outline,
          tokens: tokens,
          pressed: outlineOpen,
          onPressed: onOutlineToggle,
        );

      case MawyViewerToolbarItem.copy:
        return MawyToolbarButton(
          icon: copied ? LucideIcons.check : LucideIcons.copy,
          label: copied ? strings.copied : strings.copy,
          tokens: tokens,
          pressed: copied,
          onPressed: onCopy,
        );
    }
  }

  Widget _slider({
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
      tokens: tokens,
      builder: (VoidCallback close) => _Slider(
        tokens: tokens,
        label: label,
        resetLabel: strings.reset,
        range: range,
        value: value,
        fallback: fallback,
        format: format,
        onChanged: apply,
      ),
    );
  }
}

/* -------------------------------------------------------------------------
 * The controls
 * ---------------------------------------------------------------------- */

/// One icon button on the toolbar.
class MawyToolbarButton extends StatefulWidget {
  /// Creates a toolbar button.
  const MawyToolbarButton({
    required this.icon,
    required this.label,
    required this.tokens,
    required this.onPressed,
    this.pressed = false,
    super.key,
  });

  /// The glyph.
  final IconData icon;

  /// What it is called, to a screen reader and in a tooltip.
  final String label;

  /// The palette.
  final MawyTokens tokens;

  /// What pressing it does.
  final VoidCallback onPressed;

  /// Whether it is showing as on.
  final bool pressed;

  @override
  State<MawyToolbarButton> createState() => _MawyToolbarButtonState();
}

class _MawyToolbarButtonState extends State<MawyToolbarButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final bool lit = _hovered || widget.pressed;

    return Semantics(
      button: true,
      toggled: widget.pressed,
      label: widget.label,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (PointerEnterEvent _) => setState(() => _hovered = true),
        onExit: (PointerExitEvent _) => setState(() => _hovered = false),
        child: GestureDetector(
          onTap: widget.onPressed,
          child: AnimatedContainer(
            duration: MawyMotion.duration,
            curve: MawyMotion.easing,
            width: 30,
            height: 30,
            margin: const EdgeInsets.symmetric(horizontal: 1),
            decoration: BoxDecoration(
              color: widget.pressed ? tokens.accentSoft : (lit ? tokens.backgroundSunken : null),
              borderRadius: BorderRadius.circular(MawyRadius.small),
            ),
            child: Icon(
              widget.icon,
              size: 16,
              color: widget.pressed
                  ? tokens.accent
                  : (lit ? tokens.foreground : tokens.foregroundMuted),
            ),
          ),
        ),
      ),
    );
  }
}

/// A toolbar button that puts a panel under itself.
class MawyToolbarMenu extends StatefulWidget {
  /// Creates a menu button.
  const MawyToolbarMenu({
    required this.icon,
    required this.label,
    required this.tokens,
    required this.builder,
    super.key,
  });

  /// The glyph.
  final IconData icon;

  /// What it is called.
  final String label;

  /// The palette.
  final MawyTokens tokens;

  /// What goes in the panel. The callback closes it.
  final Widget Function(VoidCallback close) builder;

  @override
  State<MawyToolbarMenu> createState() => _MawyToolbarMenuState();
}

class _MawyToolbarMenuState extends State<MawyToolbarMenu> {
  final LayerLink _link = LayerLink();
  OverlayEntry? _entry;

  @override
  void dispose() {
    _close();
    super.dispose();
  }

  void _close() {
    _entry?.remove();
    _entry = null;
  }

  void _toggle() {
    if (_entry != null) {
      setState(_close);

      return;
    }

    final OverlayState overlay = Overlay.of(context);

    _entry = OverlayEntry(
      builder: (BuildContext context) => Stack(
        children: <Widget>[
          // A tap anywhere else closes it, which is what a menu does and what a
          // panel pinned to a button would otherwise not do.
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onTap: () => setState(_close),
            ),
          ),
          CompositedTransformFollower(
            link: _link,
            targetAnchor: Alignment.bottomRight,
            followerAnchor: Alignment.topRight,
            offset: const Offset(0, 6),
            child: Align(
              alignment: Alignment.topRight,
              child: Container(
                constraints: const BoxConstraints(minWidth: 190, maxWidth: 260),
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: widget.tokens.backgroundRaised,
                  borderRadius: BorderRadius.circular(MawyRadius.large),
                  border: Border.all(color: widget.tokens.border),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: const Color(0xFF101018).withValues(alpha: 0.14),
                      blurRadius: 28,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: widget.builder(() => setState(_close)),
              ),
            ),
          ),
        ],
      ),
    );

    overlay.insert(_entry!);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _link,
      child: MawyToolbarButton(
        icon: widget.icon,
        label: widget.label,
        tokens: widget.tokens,
        pressed: _entry != null,
        onPressed: _toggle,
      ),
    );
  }
}

/// A list of options, one of them chosen.
class _Choice<T> extends StatelessWidget {
  const _Choice({
    required this.tokens,
    required this.value,
    required this.options,
    required this.onChanged,
  });

  final MawyTokens tokens;
  final T value;
  final List<(T, String)> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: options.map(((T, String) option) {
        final bool chosen = option.$1 == value;

        return Semantics(
          inMutuallyExclusiveGroup: true,
          selected: chosen,
          button: true,
          child: GestureDetector(
            onTap: () => onChanged(option.$1),
            child: MouseRegion(
              cursor: SystemMouseCursors.click,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: chosen ? tokens.accentSoft : null,
                  borderRadius: BorderRadius.circular(MawyRadius.small),
                ),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        option.$2,
                        style: TextStyle(
                          color: chosen ? tokens.accent : tokens.foreground,
                          fontSize: 13.5,
                          fontWeight: chosen ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ),
                    if (chosen) Icon(LucideIcons.check, size: 14, color: tokens.accent),
                  ],
                ),
              ),
            ),
          ),
        );
      }).toList(),
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
        if (clamped != fallback)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: GestureDetector(
              onTap: () => onChanged(fallback),
              child: MouseRegion(
                cursor: SystemMouseCursors.click,
                child: Text(
                  resetLabel,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: tokens.accent, fontSize: 12),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _Track extends StatelessWidget {
  const _Track({required this.tokens, required this.fraction, required this.onFraction});

  final MawyTokens tokens;
  final double fraction;
  final ValueChanged<double> onFraction;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        void at(Offset local) => onFraction((local.dx / constraints.maxWidth).clamp(0, 1));

        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (TapDownDetails details) => at(details.localPosition),
          onHorizontalDragUpdate: (DragUpdateDetails details) => at(details.localPosition),
          child: SizedBox(
            height: 30,
            child: Center(
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
                    widthFactor: fraction.clamp(0, 1),
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: tokens.accent,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
