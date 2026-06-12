# CorpoRite

A Chrome extension that provides real-time suggestions for **professional corporate English** as you type in Hinglish (or informal Indian English) on any website.

## Features

- Works on **any text field**: `<input>`, `<textarea>`, and `contenteditable` (Gmail, LinkedIn, Slack, Notion, etc.)
- **Google sign-in** — no API key required; uses CorpoRite credits
- **50 free credits/month** + optional credit packs via Stripe
- **Manual shortcut** `Alt+Shift+C` to open suggestions (saves credits)
- **Optional auto-suggest** while typing (off by default)
- **Formality levels**: casual professional, professional, formal, executive
- **Keep original tone** toggle
- **Accept** replaces text; **Regenerate** tries again; **Ctrl+Enter** quick accept

## Requirements

- Google Chrome (or Chromium-based browser)
- A CorpoRite account (sign in with Google)

## Install (developer mode)

1. Generate icons (once):

   ```bash
   node scripts/generate-icons.mjs
   ```

2. Start the web backend (see [web/README.md](web/README.md)):

   ```bash
   cd web && npm install && npm run dev
   ```

3. Open Chrome → **Extensions** → enable **Developer mode** → **Load unpacked** → select this folder.

4. Click the CorpoRite toolbar icon → **Sign in with Google**.

5. Set `API_BASE_URL` in `shared/constants.js` to your web app URL (default: `http://localhost:3000`).

## Usage

1. Sign in via the extension popup.
2. Go to any site with a text box.
3. Type in Hinglish, e.g. `Kal meeting postpone karni padegi, client ko inform kar dena`.
4. Press **Alt+Shift+C** for a suggestion.
5. Click **Accept** (or **Ctrl+Enter**) to replace your text.

## Project structure

```
CorpoRite/
├── web/                   # Next.js site + API + dashboard
├── manifest.json
├── background.js          # Backend API calls
├── shared/
│   ├── constants.js
│   └── auth.js            # Google sign-in for extension
├── content/               # In-page suggestion UI
├── popup/                 # Quick controls + sign-in
└── options/               # Full settings
```

## License

MIT — use and modify freely.
