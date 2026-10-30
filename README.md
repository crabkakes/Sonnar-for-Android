# Remote for Sonarr

A native iPhone and Android app for managing your own [Sonarr](https://sonarr.tv) server from your phone. Sonarr's web UI is built for computers. This app is built for one-handed use.

Unofficial: this project is not affiliated with Sonarr.

## What it does

- **Shows**: your library with posters, episode counts, progress bars, search and filter. Add new shows with a lookup.
- **Show detail**: seasons and episodes with status, automatic search for an episode or season, manual release search (pick the release yourself), monitoring toggles, and delete.
- **Calendar**: a week strip with a day list of what's airing, in your time zone.
- **Activity**: the download queue (with remove and block) and paged history.
- **Sample data**: a clearly labeled mode to explore every screen without a Sonarr. Nothing in it changes anything.

Light and dark themes follow your system setting.

## Privacy and networking

The app talks directly to your Sonarr, with no servers in between. There is no proxy, backend, analytics, tracking, crash reporting, or account. Your server address and API key are kept in the device's secure storage (Keychain/Keystore) and are only sent to your Sonarr.

Your phone must be able to reach Sonarr, so use it on your local network or over a VPN (WireGuard, Tailscale, and so on). Plain `http://` addresses such as `http://192.168.1.50:8989` work. Self-signed HTTPS certificates are not supported. Sonarr v3 and v4 are supported.

## Install

- App Store (iPhone) and Google Play (Android).
- Or download the signed APK from the [GitHub Releases](../../releases) page. It uses the same signing key as the Play build.

## Development

```sh
npm install
npx expo start
```

Use Expo Go for everyday UI work. Expo Go does not use this app's Info.plist, Local Network string, or secure storage config, so for the full check use a dev build on a Mac with `npx expo run:ios --device` (Android: `npx expo run:android`).

```sh
npm test
npm run typecheck
npm run lint
```

Release steps, signing, and the device checklist are in [docs/RELEASING.md](docs/RELEASING.md).
