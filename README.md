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
- This is **not** an Android APK. GitHub Pages hosts a web application.

## Structure

- `index.html`: the **single source** for the web app, update this file.
- `.nojekyll`: allows direct publishing of static files.
- `.github/workflows/validate-and-package.yml`: validates inline JavaScript and creates a downloadable ZIP artifact on commits.
- `scripts/check_html.py`: dependency-free HTML and inline JavaScript extraction for syntax checks.
- UI previews are included with the separately downloadable project package; they are not required for the deployed app.
- `THIRD_PARTY_NOTICES.md`: credits and compliance notes.

## Current checks

The GitHub workflow checks HTML entry points and runs `node --check` against the extracted inline JavaScript. This is a **source syntax check**, not a guarantee that GPS/routing/AI providers work or that a phone test passed.