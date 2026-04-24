<!--
Paste this into the GitHub Release body when publishing a new version.
Replace <version> and fill in the "Changes" section.
-->

## Install

### macOS — Homebrew

```sh
brew install --cask itsmejay80/tap/nook
```

### macOS — direct DMG

Download `Nook-<version>-arm64.dmg` (Apple Silicon) or `Nook-<version>-x64.dmg` (Intel), drag **Nook.app** to `/Applications`, then run:

```sh
xattr -dr com.apple.quarantine /Applications/Nook.app
```

Nook is ad-hoc signed but not Apple-notarized, so without this step macOS blocks launch with *"Apple could not verify Nook is free of malware…"*. You can also right-click **Nook.app** → **Open** → **Open Anyway** on first launch.

### Windows

Download and run `Nook-Setup-<version>.exe`.

## Changes

- …
