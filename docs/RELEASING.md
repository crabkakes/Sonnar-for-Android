# Releasing Remote for Sonarr

## 1. One-time: the shared signing key

The free APK (GitHub Releases) and the Play Store build must be signed with the **same key**, so people can move between the two without reinstalling. The key lives outside the repo. `*.jks` and `*.keystore` are gitignored.

1. Generate it:

   ```sh
   keytool -genkeypair -v -keystore rfs.jks -alias rfs -keyalg RSA -keysize 4096 -validity 10000
   ```

2. Back up `rfs.jks` and its passwords offline (password manager plus an offline copy). If you lose it you cannot ship updates under the same identity.
3. Add these GitHub repository secrets (Settings, Secrets and variables, Actions). The workflow uses exactly these:
   - `RFS_KEYSTORE_BASE64`: the keystore, encoded with `base64 -w0 rfs.jks` (macOS: `base64 -i rfs.jks`)
   - `RFS_KEYSTORE_PASSWORD`
   - `RFS_KEY_ALIAS` (`rfs` if you used the command above)
   - `RFS_KEY_PASSWORD`

   The fifth value, `RFS_KEYSTORE_PATH`, is not a secret. The workflow sets it to `$RUNNER_TEMP/rfs.jks`. All five values are visible only to the Gradle build step, which decodes the keystore, builds, and deletes it.
4. In Play Console, open App signing and choose **Use your own key**. Upload `rfs.jks` with Google's PEPK tool **before the first release**.

> **This is permanent.** The key and the Android package name (`APP_ID` in `app.config.ts`) cannot be changed after the first store upload. Decide both before you upload anything.

Local builds without the `RFS_*` variables fall back to debug signing, so `npx expo run:android` keeps working.

## 2. Releasing Android

1. Bump `version` in `app.config.ts` and `package.json`, and increase `android.versionCode` in `app.config.ts` (it must increase on every Play upload).
2. Commit, then tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The `Release` workflow lints, tests, builds, and signs the app, then creates a GitHub release with `remote-for-sonarr-vX.Y.Z.apk` attached.
4. Download the `remote-for-sonarr-aab` artifact from the workflow run and upload the `.aab` to Play Console.

## 3. Releasing iOS (on the Mac)

1. Bump `ios.buildNumber` in `app.config.ts` (and `version` if it changed).
2. `npx expo prebuild -p ios`
3. Open `ios/*.xcworkspace` in Xcode.
4. Product, Archive, then Distribute App, App Store Connect, upload.
5. In App Store Connect, test via TestFlight, then submit for review.

## 4. Store review notes

Paste into the review notes field:

> This app controls a user's self-hosted Sonarr server on their own local network. To review without a server, tap 'Explore with sample data' on the first screen. Every screen works with sample data.

App Transport Security justification (the app sets `NSAllowsArbitraryLoads`):

> Users enter the address of their own self-hosted server, typically a local IP over plain HTTP; the address is not known in advance.

## 5. Privacy

The app collects no data. It talks only to the Sonarr server the user enters.

- App Store privacy label: **Data Not Collected**
- Play Data safety: **No data collected**

## 6. Device verification checklist

The owner does this on their iPhone with a dev build (`npx expo run:ios --device` on the Mac). The friend repeats it on Android with a locally built APK. Record results in the PR.

- [ ] The Local Network prompt appears with the app's text, and connecting via `http://<LAN IP>:8989` works.
- [ ] Connecting via the VPN by IP works.
- [ ] Connecting via a VPN hostname over plain `http://` works (for example a Tailscale MagicDNS name like `http://nas.tailnet-name.ts.net:8989`, or `http://nas.lan:8989`). On iOS this checks that ATS allows HTTP to arbitrary hosts.
- [ ] Kill and reopen the app: you stay connected, screens show cached data instantly, then refresh.
- [ ] Turn Wi-Fi/VPN off with the app open: the stale banner appears, cached data stays, and nothing crashes.
- [ ] Add a show, search an episode, pick and grab a release, remove a queue item with block, and check each against the Sonarr web UI.
- [ ] Sample-data mode works with no network at all.
