/// The browser half of `host.dart`.
library;

import 'dart:js_interop';

import 'package:mawy/mawy.dart';
import 'package:web/web.dart' as web;

/// Listens to the page around the frame for the palette it is drawn in.
///
/// Two messages, both named so that nothing else on the page mistakes them for
/// its own: `{mawy: 'ready'}` goes up when this is listening, and
/// `{mawy: 'colorScheme', value: 'light' | 'dark' | 'system'}` comes down.
///
/// The `ready` half is not politeness, it is the whole handshake. An engine
/// boots for as long as it takes to arrive over the network — and with the
/// frame loading lazily, that may be long after the reader last touched the
/// switch. A page that pushed the palette and hoped would be pushing at a frame
/// with nothing in it yet. So the frame speaks first, and the page answers with
/// wherever the switch is by then.
void Function()? listenToHostColorScheme(void Function(MawyColorScheme) onScheme) {
  final String origin = web.window.location.origin;

  void handle(web.MessageEvent event) {
    // Same origin or nothing. The site serves this build itself, so the page
    // around the frame is the only page entitled to be talking; a message from
    // anywhere else is somebody else's page with this one framed inside it,
    // which is not a thing to take the palette from.
    if (event.origin != origin) {
      return;
    }

    final Object? data = event.data.dartify();

    if (data is! Map || data['mawy'] != 'colorScheme') {
      return;
    }

    final MawyColorScheme? scheme = switch (data['value']) {
      'light' => MawyColorScheme.light,
      'dark' => MawyColorScheme.dark,
      'system' => MawyColorScheme.system,
      _ => null,
    };

    if (scheme != null) {
      onScheme(scheme);
    }
  }

  final web.EventListener listener = handle.toJS;

  web.window.addEventListener('message', listener);

  // `parent` is this window when nothing is framing it, so this is a message to
  // itself — which the handler above reads, finds is not a palette, and drops.
  // Cheaper than asking whether there is a page up there, and the answer to
  // that question is not one a frame can trust anyway.
  web.window.parent?.postMessage(<String, String>{'mawy': 'ready'}.jsify(), origin.toJS);

  return () => web.window.removeEventListener('message', listener);
}
