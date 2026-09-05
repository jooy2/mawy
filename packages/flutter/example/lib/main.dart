/// The Mawy gallery.
///
/// Two jobs, and they are the same code seen from two sides:
///
/// - Run it (`flutter run`) and it is a gallery — a document, the toolbar, and
///   a switch between the samples. This is how the viewer is looked at while it
///   is being built.
/// - Build it for the web and the documentation site embeds it, one demo per
///   `<iframe>`, named by `?demo=viewer/basic`. That is what makes the Flutter
///   previews on the site the *real* Flutter build rather than a screenshot.
///
/// Nothing here imports Material or Cupertino, for the same reason the library
/// does not: a gallery that needed a `MaterialApp` around it would not be
/// showing what a consumer of this package actually gets.
library;

import 'dart:async';

import 'package:desktop_drop/desktop_drop.dart';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/widgets.dart';
import 'package:mawy/mawy.dart';
import 'package:mawy_example/host.dart';
import 'package:mawy_example/samples.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  runApp(const GalleryApp());
}

/// The gallery.
class GalleryApp extends StatefulWidget {
  /// Creates the gallery.
  const GalleryApp({super.key});

  @override
  State<GalleryApp> createState() => _GalleryAppState();
}

class _GalleryAppState extends State<GalleryApp> {
  /// Which demo the documentation site asked for, if it asked for one.
  ///
  /// Read once from the page's own query string. An embedded preview shows one
  /// document and no gallery chrome; run as an app there is no query string and
  /// it shows all of them.
  static final String? _wanted = Uri.base.queryParameters['demo'];

  /// Which language the embedding page is written in, where it said.
  ///
  /// The React previews on the site are handed the page's locale as a prop, and
  /// until this was read the Flutter preview beside one of them on a Korean
  /// page was the only thing on that page with an English toolbar. Run as an
  /// app there is no query string, and the sample decides for itself.
  static final MawyLocale? _asked = switch (Uri.base.queryParameters['locale']) {
    'ko' => MawyLocale.ko,
    'en' => MawyLocale.en,
    _ => null,
  };

  int _at = 0;

  /// Which palette everything is drawn in.
  ///
  /// [MawyColorScheme.system] until something says otherwise, which is the
  /// platform's brightness and the right answer for a gallery that is the whole
  /// application. Framed on the documentation site it is the wrong one the
  /// moment a reader's site switch disagrees with their OS, so the page around
  /// the frame says which — see `host.dart` for why it says it rather than
  /// putting it in the query string with `demo` and `locale`.
  MawyColorScheme _scheme = MawyColorScheme.system;

  /// What stops listening to the page around the frame, where there is one.
  void Function()? _stopListening;

  /// The document, once one has been opened over the sample.
  ///
  /// The gallery hands `MawyEditor` a `defaultValue` and lets it hold its own
  /// string, so opening a file means handing it a different one — a key on the
  /// document is what makes that a new editor rather than an argument the old
  /// one ignores.
  String? _opened;

  @override
  void initState() {
    super.initState();

    _stopListening = listenToHostColorScheme((MawyColorScheme next) {
      if (mounted) {
        setState(() => _scheme = next);
      }
    });
  }

  @override
  void dispose() {
    _stopListening?.call();
    super.dispose();
  }

  Sample get _sample {
    final String? wanted = _wanted;

    if (wanted != null) {
      for (final Sample sample in samples) {
        if (sample.id == wanted) {
          return sample;
        }
      }
    }

    return samples[_at];
  }

  /// The language the chrome is written in, and which document is shown with it.
  MawyLocale get _locale =>
      _asked ?? (_sample.id == 'viewer/prose' ? MawyLocale.ko : MawyLocale.en);

  @override
  Widget build(BuildContext context) {
    final bool embedded = _wanted != null;
    final Sample sample = _sample;
    final MawyLocale locale = _locale;

    return WidgetsApp(
      title: 'Mawy',
      color: const Color(0xFF5B34EA),
      debugShowCheckedModeBanner: false,
      builder: (BuildContext context, Widget? _) {
        // The viewer is built in here rather than above, because the gallery's
        // own directives have to be drawn in the palette the viewer is drawn
        // in - and until a reader picks one that is the platform's brightness,
        // which is a `MediaQuery` and only exists under the app.
        final MawyTokens tokens = MawyTokens.of(_brightness(context));

        // The samples that are not a document to read but a document to
        // write, so they are the editor rather than the viewer.
        if (sample.editor) {
          final Widget editor = MawyEditor(
            key: ValueKey<String>('${sample.id}${_opened?.length ?? ''}'),
            defaultValue: _opened ?? sample.valueFor(locale),
            colorScheme: _scheme,
            onColorSchemeChange: (MawyColorScheme next) => setState(() => _scheme = next),
            locale: locale,
            directives: _directives(tokens),
            highlight: mawyHighlighter,
            onLinkTap: _open,
            onOpen: _chooseFile,
          );

          // A file dropped on the window opens in the editor, which is the
          // other half of `onOpen` and the same argument: catching a drop is a
          // plugin, and the library refuses plugins.
          final Widget dropping = DropTarget(
            onDragDone: (DropDoneDetails details) => _readFirst(details.files),
            child: editor,
          );

          return embedded
              ? dropping
              : Column(
                  children: <Widget>[
                    _Switch(sample: sample, onChange: _choose),
                    Expanded(child: dropping),
                  ],
                );
        }

        final Widget viewer = MawyViewer(
          // A key on the document, so switching samples starts a fresh viewer
          // rather than one that remembers the last one's scroll position.
          key: ValueKey<String>(sample.id),
          value: sample.valueFor(locale),
          colorScheme: _scheme,
          onColorSchemeChange: (MawyColorScheme next) => setState(() => _scheme = next),
          toolbar: sample.id == 'viewer/minimal'
              ? const <MawyViewerToolbarItem>[]
              : kMawyViewerToolbar,
          locale: locale,
          directives: _directives(tokens),
          // The gallery is where the viewer is looked at, so it asks for the
          // colour an application would have to ask for too.
          highlight: mawyHighlighter,
          onLinkTap: _open,
        );

        return embedded
            ? viewer
            : Column(
                children: <Widget>[
                  _Switch(sample: sample, onChange: _choose),
                  Expanded(child: viewer),
                ],
              );
      },
    );
  }

  /// What a tapped link does.
  ///
  /// The library hands a URL over and stops there, which is the whole of its
  /// answer: opening one needs a plugin, every application has already chosen
  /// which, and a Markdown viewer is not the thing that should choose for it.
  /// This is an application, so it chooses — and a gallery whose links did
  /// nothing was showing a viewer that looks broken rather than one that is
  /// waiting to be told.
  void _open(String url, String? title) {
    final Uri? target = Uri.tryParse(url);

    if (target == null) {
      return;
    }

    // Launched at once rather than after asking whether it can be. On the web
    // this is `window.open`, and a browser only allows that while it is still
    // handling the press that asked for it — an `await canLaunchUrl(...)` first
    // spends the press, and the tab is refused with nothing said. Whatever goes
    // wrong is this callback's rather than the reader's.
    unawaited(
      launchUrl(target, mode: LaunchMode.externalApplication).catchError((Object _) => false),
    );
  }

  /// A document, chosen from wherever this machine keeps them.
  Future<void> _chooseFile() async {
    const XTypeGroup markdown = XTypeGroup(
      label: 'Markdown',
      extensions: <String>['md', 'markdown', 'mdown', 'mkd', 'mdx', 'txt'],
      // Safari and Firefox read the extensions; every other browser wants a
      // MIME type, and a picker that offers nothing is a picker nobody can use.
      mimeTypes: <String>['text/markdown', 'text/plain'],
    );

    final XFile? file = await openFile(acceptedTypeGroups: <XTypeGroup>[markdown]);

    if (file != null) {
      await _readFirst(<XFile>[file]);
    }
  }

  /// The first of whatever arrived, read as text and put in the editor.
  Future<void> _readFirst(List<XFile> files) async {
    if (files.isEmpty) {
      return;
    }

    final String text = await files.first.readAsString();

    if (mounted) {
      setState(() => _opened = text);
    }
  }

  /// Which palette the viewer is drawing in, resolved the way it resolves it.
  Brightness _brightness(BuildContext context) => switch (_scheme) {
    MawyColorScheme.light => Brightness.light,
    MawyColorScheme.dark => Brightness.dark,
    MawyColorScheme.system => MediaQuery.platformBrightnessOf(context),
  };

  void _choose(int index) => setState(() => _at = index);
}

/// The gallery's own switch between documents. Not part of the library.
class _Switch extends StatelessWidget {
  const _Switch({required this.sample, required this.onChange});

  final Sample sample;
  final ValueChanged<int> onChange;

  @override
  Widget build(BuildContext context) {
    final bool dark = MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    final MawyTokens tokens = MawyTokens.of(dark ? Brightness.dark : Brightness.light);

    return Container(
      color: tokens.backgroundSunken,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      child: SafeArea(
        bottom: false,
        // Six documents and counting, and the row of chips is wider than a
        // phone before the list is interesting. It slides, the way the
        // editor's own toolbar does on this platform.
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              for (int index = 0; index < samples.length; index += 1)
                GestureDetector(
                  onTap: () => onChange(index),
                  child: Container(
                    margin: const EdgeInsets.only(right: 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: samples[index].id == sample.id ? tokens.accentSoft : null,
                      borderRadius: BorderRadius.circular(MawyRadius.medium),
                      border: Border.all(color: tokens.border),
                    ),
                    child: Text(
                      samples[index].label,
                      style: TextStyle(
                        color: samples[index].id == sample.id
                            ? tokens.accent
                            : tokens.foregroundMuted,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// What the gallery's directives mean.
///
/// Three names, and `youtube` deliberately not among them. What a viewer does
/// with a name nobody claimed is as much a part of the demo as the three that
/// were claimed: it draws the characters the document was written with, which
/// is the one fallback that cannot lose anything.
///
/// Every builder is handed pieces that are already drawn — a `label` as an
/// [InlineSpan], a container's `children` as widgets — so what is written here
/// composes widgets and never sees markup of any kind.
Map<String, MawyDirectiveBuilder> _directives(MawyTokens tokens) => <String, MawyDirectiveBuilder>{
  'callout': (BuildContext context, MawyDirective directive) => _Callout(
    tokens: tokens,
    kind: directive.attributes['kind'],
    label: directive.label,
    children: directive.children ?? const <Widget>[],
  ),
  'progress': (BuildContext context, MawyDirective directive) => _Progress(
    tokens: tokens,
    label: directive.attributes['label'] ?? 'Progress',
    // Every attribute is a string, because a string is all the document
    // said. Reading one as a number is the builder's, and so is deciding
    // what a missing one means.
    value: (double.tryParse(directive.attributes['value'] ?? '') ?? 0).clamp(0, 100).toDouble(),
  ),
  'kbd': (BuildContext context, MawyDirective directive) =>
      _Kbd(tokens: tokens, label: directive.label),
};

/// The house callout, which is the directive every document turns out to want.
class _Callout extends StatelessWidget {
  const _Callout({
    required this.tokens,
    required this.kind,
    required this.label,
    required this.children,
  });

  final MawyTokens tokens;
  final String? kind;
  final InlineSpan? label;
  final List<Widget> children;

  Color get _colour => switch (kind) {
    'tip' => tokens.tip,
    'warning' => tokens.warning,
    'caution' => tokens.caution,
    'important' => tokens.important,
    _ => tokens.note,
  };

  @override
  Widget build(BuildContext context) {
    final Color colour = _colour;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      // A rule down one side and a rounded box are one decoration in CSS and
      // two widgets here: `BoxDecoration` will not round a border that is not
      // the same on all four sides.
      child: IntrinsicHeight(
        child: Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            color: tokens.backgroundSunken,
            borderRadius: BorderRadius.circular(MawyRadius.medium),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              ColoredBox(color: colour, child: const SizedBox(width: 3)),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      if (label != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text.rich(
                            label!,
                            style: TextStyle(
                              color: colour,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ...children,
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A bar, from `{value=…}`. A leaf directive is a line and nothing under it.
class _Progress extends StatelessWidget {
  const _Progress({required this.tokens, required this.label, required this.value});

  final MawyTokens tokens;
  final String label;

  /// Out of a hundred.
  final double value;

  @override
  Widget build(BuildContext context) {
    final TextStyle caption = TextStyle(color: tokens.foregroundMuted, fontSize: 13);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Text(label, style: caption),
              Text('${value.round()}%', style: caption),
            ],
          ),
          const SizedBox(height: 6),
          Container(
            height: 9,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              color: tokens.background,
              border: Border.all(color: tokens.border),
              borderRadius: BorderRadius.circular(MawyRadius.small),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: value / 100,
              child: ColoredBox(color: tokens.accent),
            ),
          ),
        ],
      ),
    );
  }
}

/// A key cap.
///
/// A text directive is placed in the sentence as a `WidgetSpan`, so a builder
/// for one should return something that sits on a line of text.
class _Kbd extends StatelessWidget {
  const _Kbd({required this.tokens, required this.label});

  final MawyTokens tokens;
  final InlineSpan? label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(
        color: tokens.codeBackground,
        border: Border.all(color: tokens.borderStrong),
        borderRadius: BorderRadius.circular(MawyRadius.small),
      ),
      child: Text.rich(
        label ?? const TextSpan(),
        style: TextStyle(color: tokens.codeForeground, fontSize: 13),
      ),
    );
  }
}
