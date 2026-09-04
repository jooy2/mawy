/// The furniture both toolbars are made of.
///
/// A button, a menu, and a set of options inside a menu. Two toolbars in this
/// package draw with these — the viewer's, which is about how a document is
/// set, and the editor's, which is about what it says — and a widget both of
/// them use living in one of their files is a file the other has to import for
/// a reason that has nothing to do with it.
///
/// Built on `package:flutter/widgets.dart`, with the menus put up through an
/// [Overlay] — the application's where it has one, and the component's own
/// where it has not. Material would have been less code and would have brought
/// its own palette, its own ripple and its own sizes into a component that has
/// all three of its own.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:mawy/src/internal/focus_visible.dart';
import 'package:mawy/src/internal/i18n.dart';
import 'package:mawy/src/internal/roving.dart';
import 'package:mawy/src/theme/tokens.dart';
import 'package:mawy/src/types.dart';

/* -------------------------------------------------------------------------
 * The controls
 * ---------------------------------------------------------------------- */

/// One icon button on the toolbar.
///
/// Focusable, and activated by Enter and by the space bar as well as by a
/// pointer — the shortcuts are written out here rather than inherited, because
/// this package does not require a [WidgetsApp] and it is a [WidgetsApp] that
/// would otherwise be supplying them.
class MawyToolbarButton extends StatefulWidget {
  /// Creates a toolbar button.
  const MawyToolbarButton({
    required this.icon,
    required this.label,
    required this.tokens,
    required this.onPressed,
    this.pressed = false,
    this.enabled = true,
    this.focusNode,
    this.autofocus = false,
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

  /// Whether it can be pressed at all.
  ///
  /// A disabled button is still drawn and still in the row — one that leaves
  /// the layout is one the focus walks past and the eye looks for.
  final bool enabled;

  /// The node the row's [MawyRoving] gave this control, where it is in one.
  ///
  /// A button outside a row — the two beside a slider's track, inside a menu —
  /// makes its own and keeps it.
  final FocusNode? focusNode;

  /// Whether it takes the focus as soon as it is drawn.
  final bool autofocus;

  @override
  State<MawyToolbarButton> createState() => _MawyToolbarButtonState();
}

class _MawyToolbarButtonState extends State<MawyToolbarButton> {
  final LayerLink _link = LayerLink();

  bool _hovered = false;
  bool _focused = false;
  FocusNode? _own;
  OverlayEntry? _tip;

  FocusNode get _node => widget.focusNode ?? (_own ??= FocusNode(debugLabel: widget.label));

  @override
  void dispose() {
    _hideTip();
    _own?.dispose();
    super.dispose();
  }

  /// The button's name, under the button, while a pointer is on it.
  ///
  /// An icon with no word beside it is a control nobody can name, and the two
  /// answers to that are a label on every button — a toolbar twice as wide —
  /// or the name on demand. This is the second, and it is the React package's
  /// own tooltip rather than the platform's: it appears the moment the pointer
  /// arrives rather than a second later, and it is drawn in the palette
  /// everything else here is drawn in.
  ///
  /// Only for a pointer. A finger has nothing to hover with, and a keyboard is
  /// given the name through [Semantics] rather than through a picture of it.
  void _showTip() {
    final OverlayState? overlay = Overlay.maybeOf(context);

    if (_tip != null || overlay == null || !widget.enabled) {
      return;
    }

    _tip = OverlayEntry(
      builder: (BuildContext context) => IgnorePointer(
        child: CompositedTransformFollower(
          link: _link,
          targetAnchor: Alignment.bottomCenter,
          followerAnchor: Alignment.topCenter,
          offset: const Offset(0, 6),
          child: Align(
            alignment: Alignment.topCenter,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 220),
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: widget.tokens.foreground,
                borderRadius: BorderRadius.circular(MawyRadius.small),
              ),
              child: Text(
                widget.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: widget.tokens.background,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  height: 1.45,
                ),
              ),
            ),
          ),
        ),
      ),
    );

    overlay.insert(_tip!);
  }

  void _hideTip() {
    _tip?.remove();
    _tip = null;
  }

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final bool lit = widget.enabled && (_hovered || widget.pressed);

    return Semantics(
      button: true,
      toggled: widget.pressed,
      enabled: widget.enabled,
      label: widget.label,
      child: FocusableActionDetector(
        focusNode: _node,
        autofocus: widget.autofocus,
        enabled: widget.enabled,
        mouseCursor: widget.enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
        shortcuts: mawyActivate,
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              widget.onPressed();

              return null;
            },
          ),
        },
        onShowHoverHighlight: (bool on) => setState(() => _hovered = on),
        // Read at the moment the focus arrives: a ring belongs on a control a
        // keyboard reached and not on one a pointer pressed. See
        // `internal/focus_visible.dart`.
        onShowFocusHighlight: (bool on) => setState(() => _focused = on && MawyFocusVisible.wanted),
        // The tooltip is hung off the pointer entering rather than off the
        // focus highlight, because those are two different questions: the
        // highlight is "is this reader using a keyboard", and this is "is there
        // a pointer on this button". A finger raises neither.
        child: MouseRegion(
          onEnter: (PointerEnterEvent _) => _showTip(),
          onExit: (PointerExitEvent _) => _hideTip(),
          child: GestureDetector(
            onTap: () {
              // A press is an answer; the name is no longer the question.
              _hideTip();

              if (widget.enabled) {
                widget.onPressed();
              }
            },
            child: CompositedTransformTarget(
              link: _link,
              child: AnimatedContainer(
                duration: MawyMotion.durationOf(context),
                curve: MawyMotion.easing,
                width: 30,
                height: 30,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: widget.pressed
                      ? tokens.accentSoft
                      : (lit ? tokens.backgroundSunken : null),
                  borderRadius: BorderRadius.circular(MawyRadius.small),
                ),
                // A ring, drawn over the button rather than behind it.
                //
                // A `BoxShadow` is a filled shape: spread it two pixels behind a
                // button whose own background is nothing and what is drawn is a
                // solid block of accent with the glyph lost in it, which is what
                // the first control on a toolbar looked like the moment the view
                // took the focus. A foreground border is hollow, and it is the
                // stylesheet's `outline` said in Flutter — it takes no pixel off
                // the button, because the button is a fixed thirty either way.
                foregroundDecoration: _focused
                    ? BoxDecoration(
                        borderRadius: BorderRadius.circular(MawyRadius.small),
                        border: Border.all(color: tokens.accent, width: 2),
                      )
                    : null,
                child: Opacity(
                  opacity: widget.enabled ? 1 : 0.4,
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
          ),
        ),
      ),
    );
  }
}

/// A toolbar button that puts a panel under itself.
///
/// The panel does the three things a panel has to do, and they are the three
/// the React package's does: it shuts on Escape, it shuts on a tap elsewhere,
/// and it gives the focus back to the button it came from. It is a
/// [FocusScope], so Tab goes round the controls inside it rather than out of
/// the panel and down the document — which matters here more than it does in a
/// browser, because the panel is in the [Overlay] rather than beside its own
/// button.
class MawyToolbarMenu extends StatefulWidget {
  /// Creates a menu button.
  const MawyToolbarMenu({
    required this.icon,
    required this.label,
    required this.tokens,
    required this.builder,
    this.focusNode,
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

  /// The node the row's [MawyRoving] gave this control.
  final FocusNode? focusNode;

  @override
  State<MawyToolbarMenu> createState() => _MawyToolbarMenuState();
}

class _MawyToolbarMenuState extends State<MawyToolbarMenu> {
  final LayerLink _link = LayerLink();
  final GlobalKey _panelBox = GlobalKey(debugLabel: 'MawyToolbarMenu panel');

  /// Which edge of the button the panel is lined up with.
  ///
  /// The leading one, until that would run the panel off the far side — which
  /// is the rule the React package's menu follows, and it is not decoration:
  /// this toolbar's buttons start at the leading edge now, and a panel pinned
  /// to a button's trailing edge hangs off the window from the first one.
  bool _fromEnd = false;

  final FocusScopeNode _panel = FocusScopeNode(debugLabel: 'MawyToolbarMenu');
  FocusNode? _own;
  OverlayEntry? _entry;

  FocusNode get _button => widget.focusNode ?? (_own ??= FocusNode(debugLabel: widget.label));

  @override
  void dispose() {
    _remove();
    _panel.dispose();
    _own?.dispose();
    super.dispose();
  }

  void _remove() {
    if (_entry == null) {
      return;
    }

    GestureBinding.instance.pointerRouter.removeGlobalRoute(_anywhere);
    _entry!.remove();
    _entry = null;
  }

  /// A pointer that went down somewhere, wherever that was.
  ///
  /// This is the `mousedown` on the document that the React package's menu
  /// listens for, listened for the same way and for the same reason: a panel
  /// put up over a page has to hear a press it did not receive. A catcher
  /// inside the overlay is the obvious alternative and it is worse — either it
  /// takes the press, and the next control needs a second one, or it is
  /// translucent and has to reach the top of a hit test that runs through an
  /// overlay, a follower and a stack before it.
  ///
  /// Its own button is left out, because the button is about to toggle the
  /// panel shut by itself; closing here as well would be a close and an open.
  void _anywhere(PointerEvent event) {
    if (event is! PointerDownEvent || _entry == null) {
      return;
    }

    if (_inside(_panelBox.currentContext, event.position) || _onButton(event.position)) {
      return;
    }

    _close();
  }

  /// Whether a global position is inside whatever [target] is drawn as.
  static bool _inside(BuildContext? target, Offset global) {
    final RenderObject? object = target?.findRenderObject();

    if (object is! RenderBox || !object.attached || !object.hasSize) {
      return false;
    }

    return (Offset.zero & object.size).contains(object.globalToLocal(global));
  }

  /// Shut, with the focus put back where it was before the panel had it.
  void _close() {
    final bool held = _panel.hasFocus;

    setState(_remove);

    if (held) {
      _button.requestFocus();
    }
  }

  /// Whether a panel hung from the button's leading edge would run off the far
  /// side of what it is drawn into.
  bool _runsOff(OverlayState overlay) {
    final RenderObject? button = context.findRenderObject();
    final RenderObject? into = overlay.context.findRenderObject();

    if (button is! RenderBox || into is! RenderBox || !button.attached || !into.attached) {
      return false;
    }

    final double start = into.globalToLocal(button.localToGlobal(Offset.zero)).dx;

    return start + _panelMost > into.size.width - 8;
  }

  /// Whether a pointer went down on the button this panel belongs to.
  bool _onButton(Offset global) => _inside(context, global);

  /// Escape shuts it, and nothing else here does.
  KeyEventResult _onKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent || event.logicalKey != LogicalKeyboardKey.escape) {
      return KeyEventResult.ignored;
    }

    if (_entry == null) {
      return KeyEventResult.ignored;
    }

    _close();

    return KeyEventResult.handled;
  }

  void _toggle() {
    if (_entry != null) {
      _close();

      return;
    }

    // `Overlay.of` asserts in debug and throws a null check in release, and a
    // component that has one of its own is the answer to that — see
    // `internal/overlay.dart`. Asked rather than asserted all the same: a
    // toolbar is not the place to bring an application down.
    final OverlayState? overlay = Overlay.maybeOf(context);

    if (overlay == null) {
      return;
    }

    _fromEnd = _runsOff(overlay);

    _entry = OverlayEntry(
      builder: (BuildContext context) => Stack(
        children: <Widget>[
          CompositedTransformFollower(
            link: _link,
            targetAnchor: _fromEnd ? Alignment.bottomRight : Alignment.bottomLeft,
            followerAnchor: _fromEnd ? Alignment.topRight : Alignment.topLeft,
            offset: const Offset(0, 6),
            child: Align(
              alignment: _fromEnd ? Alignment.topRight : Alignment.topLeft,
              child: FocusScope(
                node: _panel,
                onKeyEvent: _onKey,
                child: Container(
                  key: _panelBox,
                  constraints: const BoxConstraints(minWidth: _panelLeast, maxWidth: _panelMost),
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
                  child: widget.builder(_close),
                ),
              ),
            ),
          ),
        ],
      ),
    );

    overlay.insert(_entry!);
    GestureBinding.instance.pointerRouter.addGlobalRoute(_anywhere);
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return CompositedTransformTarget(
      link: _link,
      // The button's own Escape, for the press that comes while the focus is
      // still on the button — which is where a pointer leaves it.
      child: Focus(
        canRequestFocus: false,
        skipTraversal: true,
        onKeyEvent: _onKey,
        child: MawyToolbarButton(
          icon: widget.icon,
          label: widget.label,
          tokens: widget.tokens,
          pressed: _entry != null,
          focusNode: _button,
          onPressed: _toggle,
        ),
      ),
    );
  }
}

/// How wide a panel is allowed to be, which is also what deciding which edge to
/// hang it from is measured against.
const double _panelLeast = 190;
const double _panelMost = 260;

/// A list of options, one of them chosen.
///
/// What goes inside a [MawyToolbarMenu] that is picking one of a few named
/// values — a typeface, a column width, a theme. Public because there are two
/// toolbars in this package and the panel a theme is chosen from should not be
/// two panels that resemble each other.
class MawyToolbarChoice<T> extends StatelessWidget {
  /// Creates the list.
  const MawyToolbarChoice({
    required this.tokens,
    required this.value,
    required this.options,
    required this.onChanged,
    super.key,
  });

  /// The palette.
  final MawyTokens tokens;

  /// Which option is the chosen one.
  final T value;

  /// Every option: the value, what to call it, and the glyph beside it.
  ///
  /// The React package's list draws one, and a list of three themes with no
  /// sun, moon or half-and-half on it is a different control rather than the
  /// same one in another language.
  final List<MawyToolbarOption<T>> options;

  /// Called with whatever was chosen. Closing the menu is the caller's.
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    // Whichever one is in use, and the first where none of them is. The panel
    // opens with the focus already in it, because it is in the overlay: Tab
    // from the button would otherwise walk the whole document before it
    // arrived. On the option that is *already true*, though — the focus landing
    // on the first of a list is the panel pointing at an answer nobody gave.
    final int start = options.indexWhere((MawyToolbarOption<T> option) => option.value == value);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (final (int at, MawyToolbarOption<T> option) in options.indexed)
          _ChoiceOption(
            tokens: tokens,
            icon: option.icon,
            style: option.style,
            label: option.label,
            chosen: option.value == value,
            autofocus: at == (start == -1 ? 0 : start),
            onChosen: () => onChanged(option.value),
          ),
      ],
    );
  }
}

/// The three themes, in the order both toolbars offer them.
///
/// Written once because both of them offer it: a list that differs between the
/// viewer's toolbar and the editor's is a difference nobody chose.
extension MawyToolbarSchemes on MawyToolbarChoice<MawyColorScheme> {
  /// Light, dark, and whatever the platform says.
  static List<MawyToolbarOption<MawyColorScheme>> of(MawyStrings strings) =>
      <MawyToolbarOption<MawyColorScheme>>[
        MawyToolbarOption<MawyColorScheme>(
          MawyColorScheme.light,
          strings.colorSchemeLight,
          icon: LucideIcons.sun,
        ),
        MawyToolbarOption<MawyColorScheme>(
          MawyColorScheme.dark,
          strings.colorSchemeDark,
          icon: LucideIcons.moon,
        ),
        MawyToolbarOption<MawyColorScheme>(
          MawyColorScheme.system,
          strings.colorSchemeSystem,
          icon: LucideIcons.sunMoon,
        ),
      ];
}

/// One row of a [MawyToolbarChoice]: a value, its name, and how it is shown.
///
/// A glyph beside the name, or the name drawn as the thing it selects, or
/// neither — whichever the React package's list does for the same control. A
/// typeface is shown by being read in, a theme by a sun or a moon, and a column
/// width by nothing but its name.
class MawyToolbarOption<T> {
  /// Creates an option.
  const MawyToolbarOption(this.value, this.label, {this.icon, this.style});

  /// What choosing it means.
  final T value;

  /// What it is called.
  final String label;

  /// The glyph beside the name, where there is one.
  final IconData? icon;

  /// What the name is drawn in, for an option that is a way of drawing text.
  final TextStyle? style;
}

/// One of them.
class _ChoiceOption extends StatefulWidget {
  const _ChoiceOption({
    required this.tokens,
    required this.icon,
    required this.style,
    required this.label,
    required this.chosen,
    required this.autofocus,
    required this.onChosen,
  });

  final MawyTokens tokens;
  final IconData? icon;
  final TextStyle? style;
  final String label;
  final bool chosen;
  final bool autofocus;
  final VoidCallback onChosen;

  @override
  State<_ChoiceOption> createState() => _ChoiceOptionState();
}

class _ChoiceOptionState extends State<_ChoiceOption> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final MawyTokens tokens = widget.tokens;
    final bool chosen = widget.chosen;

    return Semantics(
      inMutuallyExclusiveGroup: true,
      selected: chosen,
      button: true,
      child: FocusableActionDetector(
        autofocus: widget.autofocus,
        mouseCursor: SystemMouseCursors.click,
        shortcuts: const <ShortcutActivator, Intent>{
          SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.numpadEnter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
        },
        actions: <Type, Action<Intent>>{
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (ActivateIntent _) {
              widget.onChosen();

              return null;
            },
          ),
        },
        onShowFocusHighlight: (bool on) => setState(() => _focused = on && MawyFocusVisible.wanted),
        child: GestureDetector(
          onTap: widget.onChosen,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: chosen ? tokens.accentSoft : (_focused ? tokens.backgroundSunken : null),
              borderRadius: BorderRadius.circular(MawyRadius.small),
              border: Border.all(color: _focused ? tokens.accent : const Color(0x00000000)),
            ),
            child: Row(
              children: <Widget>[
                if (widget.icon != null) ...<Widget>[
                  Icon(
                    widget.icon,
                    size: 15,
                    color: chosen ? tokens.accent : tokens.foregroundMuted,
                  ),
                  const SizedBox(width: 9),
                ],
                Expanded(
                  child: Text(
                    widget.label,
                    style: (widget.style ?? const TextStyle()).copyWith(
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
  }
}
