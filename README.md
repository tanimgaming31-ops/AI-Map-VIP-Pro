# AI MAP VIP PRO 🗺️✨

Premium mobile-friendly map and navigation web application.


## Features

- Royal Night black/gold/pink, Rose Noir, and Pearl Day UI themes.
- Responsive single-page layout for Android and desktop browsers.
- Location and place search; nearby points of interest; saved places in browser storage.
- Route planning for car, foot, and bike (external routing provider permitting).
- Multilingual UI including Bangla and English; optional browser voice search.
- Optional Anthropic-powered AI Map Concierge. Requires your own API key; the rest of the map can run without it.

> **Status:** HTML/JavaScript checks and UI previews have been run. Live GPS, routes, voice, external APIs, and real Android phone functionality are **not yet verified**.

## How to publish on GitHub Pages (Android phone)

1. Create a **new Public** repository called `AI-Map-VIP-Pro` in your GitHub account. Keep it independent of Maya, Jerry and Zoya.
2. Upload `index.html` into the **root** directory and commit to `main`. GitHub Actions validates and packages the files committed to this repository.
3. Open **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` → Folder: `/(root)` → Save**.
4. When Pages finishes publishing, the site should be accessible at `https://YOUR_USERNAME.github.io/AI-Map-VIP-Pro/`.
5. To edit any time, open `index.html` on GitHub, tap **Edit (pencil)**, change content, and **Commit changes**. Pages will republish after the commit.
6. To download anytime: repository → **Code → Download ZIP**; or **Actions → Validate and Package → latest successful run → Artifacts → AI-Map-VIP-Pro** (if this workflow has been uploaded and run).

### বাংলা নির্দেশনা

- GitHub-এ **AI-Map-VIP-Pro** নামে আলাদা **Public** রিপোজিটরি খুলুন।
- `index.html` ফাইল রিপোজিটরির শুরুতে (root) আপলোড করুন। পুরো প্যাকেজের বাকি ফাইলও রাখতে পারেন।
- **Settings → Pages → Deploy from a branch → main → /(root) → Save** করুন।
- যখনই আপডেট দরকার, GitHub থেকে `index.html` এডিট করে **Commit changes** করুন।
- নতুন ZIP পেতে **Code → Download ZIP** ব্যবহার করুন। Workflow থাকলে **Actions → Artifacts** থেকেও ZIP পাবেন।

## Security and limitations

- **Never commit keys, passwords, personal location history or tokens** to the repository. Published GitHub Pages are publicly accessible.
- The optional Anthropic feature calls the API directly from the browser. **Any key entered into browser-side JavaScript can be exposed**, especially on a public/shared website. For a production/public service, move AI API requests to a secure authenticated backend. A password input does not make a browser API key private.
- Saved places and preferences live in that browser/device's storage, **not** in GitHub. Updating `index.html` normally leaves browser storage intact, but clearing browsing data or changing the site origin may remove those settings.
- Map tiles, search, routing, and AI rely on third-party services, their rate limits, connectivity and terms. GPS and microphone require browser permission and typically HTTPS.
- GitHub Pages hosts the web application, while the Android APK is produced by GitHub Actions.

## Structure

- `index.html`: the **single source** for the web app, update this file.
- `.nojekyll`: allows direct publishing of static files.
- `.github/workflows/validate-and-package.yml`: validates inline JavaScript and creates a downloadable ZIP artifact on commits.
- `scripts/check_html.py`: dependency-free HTML and inline JavaScript extraction for syntax checks.
- UI previews are included with the separately downloadable project package; they are not required for the deployed app.
- `THIRD_PARTY_NOTICES.md`: credits and compliance notes.

## Current checks

The GitHub workflow checks HTML entry points and runs `node --check` against the extracted inline JavaScript. This is a **source syntax check**, not a guarantee that GPS/routing/AI providers work or that a phone test passed.
---

## Android installable APK (new)

This is a full-screen Android app built from the **same premium HTML** as GitHub Pages.
The web interface is **packaged inside the APK** via AndroidX WebViewAssetLoader;
there is no remote-start-page dependency. Live OpenStreetMap tiles, places,
routing, map CDN resources and optional AI calls **require internet**.

- Android app ID: `com.tanimboss.aimapvippro`.
- Min Android: 8.0 (API 26), target Android 15 (API 35).
- Icon: dark Royal Navy, gold compass pin, pink VIP accents.
- Web geolocation and microphone are granted **only after Android permission prompts**.
- Web Speech Recognition may not be available in Android WebView. Test on device.
- No API keys are stored in the GitHub repository.

**Download:** GitHub > Actions > **Android APK — AI MAP VIP PRO** >
latest successful run > Artifacts > **AI-Map-VIP-Pro-Android-APK**.
GitHub Actions produces a **debug-signed APK**, for testing/sideloading, not a
Google Play production release. Any update must be built and installed again.

**Build manually:** Install Java 17, Android SDK platform 35 and Gradle 8.9.
Then `gradle -p android :app:assembleDebug`.
Gradle automatically copies the root web app to Android assets before each build.

**PWA install:** Enable GitHub Pages for `main` root; open HTTPS URL in Android
Chrome; use **Install app** / **Add to Home screen**. PWA caching saves the
application shell only, not offline navigation or map results.

**Source updates:** Edit root `index.html`, then commit to `main`.
Both GitHub Actions workflows run on push (APK workflow on relevant paths).
Use GitHub Actions artifacts for downloads. The PWA uses the current GitHub Pages
content; an installed APK requires a new build and reinstall.

**Testing status:** Uploading native wrapper code does not mean the APK
was built or that GPS, microphone, voice, AI, maps and routing were
verified on an Android phone. Check workflow logs and test on your device.


## VIP navigation map update

The map now uses **OpenFreeMap dark vector tiles** rendered with **MapLibre GL JS**. No CARTO key or Google Maps key is required. The controls support zoom, tilt between 2D/3D, rotate the map with gestures, reset bearing to north, tap to select, search, saved places, GPS (with permission), and route overlays. 3D buildings appear where map data supplies building geometry. Live map features need internet and third-party services. This is **not a Waze clone**: no crowd-sourced traffic, closures, speed traps, police markers or real-time incident reporting.

## Real GPS turn-by-turn navigation (new)
- Tap a location, choose **Directions**, select an OSRM-provided route, then **Go now**.
- Displays road geometry on a dark vector map, 2D/3D view, GPS-follow camera,
  next turn and distance, route duration, remaining distance, arrival estimate.
- Spoken navigation uses Android text-to-speech when supported by the native
  bridge (otherwise web speech synthesis where available).
- Requests location permission for foreground geolocation. Turns, reroutes
  and ETA depend on GPS accuracy, network and the routing service.
- Recalculates a route when high-accuracy GPS repeatedly indicates off-route.
- Shares from text and geographic coordinates are supported on Android
  through **Share > AI MAP VIP PRO** (shortened Google links may not resolve).
- There is **no** verified real-time signal phase, active speed-camera status,
  police locations, crowdsourced incidents, or guaranteed lane-level guidance.
  The route ETA is calculated from routing estimates rather than traffic.
- This is a prototype for evaluation, **not** road-safety-certified driving
  navigation. Keep it foregrounded and follow road signs and laws.
- The APK must be reinstalled when rebuilt; saving places is local to the
  app/browser. Do not type your API key into GitHub source code.


## Optional traffic and road-safety map, version 1.3

- **OpenStreetMap:** The TRAFFIC panel displays *mapped* traffic lights and fixed cameras, if the Overpass public service has entries nearby. Those are static features only, not live traffic-signal colors, active camera operation or complete speed-limit coverage.
- **TomTom Traffic:** In Settings, enter your OWN TomTom Maps Traffic API key and press **SAVE TRAFFIC KEY**. The Traffic panel can then request real incidents (accidents, roadworks, jams, closures) and a flow segment near the map position. Incidents and flow data only appear when authenticated requests complete successfully. Requests are throttled. No key is bundled in public source code.
- **Lane arrows:** During Go Now, the turn banner reads OSRM intersection lane hints and highlights valid lanes when provided. If no lane metadata exists, no lanes are displayed. This is not HD lane-level navigation.
- **Privacy & cost:** The optional key is saved in browser/app local storage, readable by scripts on the same origin; use a trusted personal APK/browser profile, not a shared/public kiosk. Never commit API keys to GitHub. Map center or GPS coordinate is sent to the selected data services. Traffic data provider billing, quotas and coverage depend on your key/account. The free tier is limited and may change.
- **Not available:** Live red/amber/green light phase or countdown, comprehensive speed camera database or real-time activation, Waze community police reports, traffic-aware multi-route optimization, continuously verified traffic ETA, road safety certification. No unverified item is presented as a live verified alert.
- Real GPS and traffic provider reliability still require testing on an actual Android phone and in the target region.

## Version 1.4: optional licensed congestion overlay + traffic-aware driving route

- The user must create and enter their own **TomTom API key**. Nothing is enabled on initial install beyond keyless OSM-mapped road items.
- The Settings option **Show congestion colors across map** enables TomTom's `relative0-dark` transparent raster flow tiles on top of OpenFreeMap. **Off by default:** each tile request counts against the key's traffic tile quota. Accuracy, cost and region coverage depend on TomTom.
- **Prefer traffic-aware driving routes** chooses TomTom Routing API (traffic=true), when that account supports it. Route geometry, turn text and ETA come from the **same provider**. If the service fails or guidance is incomplete, the application falls back to the existing OSRM directions, explicitly without live traffic. **Off by default** to control quota.
- TomTom may return lane sections; show them only when the API provides an applicable lane section and indicates a recommended lane. No guessed road lanes or signal timing.
- Red/green/amber live signal phase, authenticated community police locations, active camera status, comprehensive speed limits and certified driving safety are still **not supported**. OSM infrastructure nodes remain static, potentially out of date.
- Traffic routes are not automatically re-fetched each second. GPS ETA during navigation is an estimate since the latest route calculation. Traffic coverage, routing result and paid quota cannot be verified without your own key on an actual Android phone.
