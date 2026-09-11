# ChatGPT WebView no-login smoke

This is a disposable Android/Tauri shell for issue #2031.

It loads only `https://chatgpt.com` in an embedded WebView. The implementation intentionally defines no Tauri remote capability, plugin, IPC handler, filesystem bridge, shell bridge, clipboard bridge, cookie export, or automation bridge.

This source and its CI build do **not** authorize signing into ChatGPT. Installation, visible-device rendering checks, navigation checks, and any login attempt are later experiment stages. Never commit or export WebView cookies, storage, credentials, tokens, profiles, or private logs.

The package identifier is disposable and deliberately separate from every existing product/runtime.
