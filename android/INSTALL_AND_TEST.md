# AI MAP VIP PRO 1.2 — Android installation and phone test

The main navigation UI and API-key-free map are built into the Android APK.
Live maps, place search and routing require internet.

## Install from Android phone
1. Open https://github.com/tanimgaming31-ops/AI-Map-VIP-Pro/releases/tag/vip-debug-latest
2. Under Assets download `AI-Map-VIP-Pro-debug.apk` in Chrome.
3. Install the debug APK after reviewing Android's install-from-this-source prompt.
4. If Android reports an incompatible signature from an older GitHub Actions
   debug build, uninstall the previous debug app **only after backing up
   important local data**. Saved places or app preferences may be lost.

## Real-phone checklist
- [ ] Royal blue/dark style shows roads and area names.
- [ ] Search for a destination and tap Directions.
- [ ] Choose a route and see its road line, distance and estimated duration.
- [ ] Tap Go now; grant location permission and check location dot.
- [ ] Verify next-turn instructions and audible TTS (unmute and verify voice installed).
- [ ] Move in a safe setting and verify the GPS position follows.
- [ ] Verify remaining time, distance and estimated arrival change appropriately.
- [ ] Move off the planned route **only in a safe controlled test** and check rerouting.
- [ ] In WhatsApp / IMO / Messenger: Share a plain-text geo coordinate or Maps
      link using the Android share menu to AI MAP VIP PRO; test destination import.
- [ ] Verify 2D/3D toggle, north compass, map rotation and app screen options.
- [ ] Stop navigation and verify GPS watching / keep-screen-awake are disabled.
- [ ] Repeat with Bengali/English voice where a supported TTS voice is installed.

## Limitations
No live traffic, traffic-light phase, police warnings, speed camera data,
verified speed limits, lane-by-lane guidance, crash reporting, or background
turn-by-turn service while Android has stopped the app. Public routing
responses and availability can vary; no GPS data is sent to an app-owner
backend, but route queries go to the public OSRM service.

**Safety:** Do not operate the app while driving. Obey actual road signs,
traffic regulations, and local driving laws over app guidance.
