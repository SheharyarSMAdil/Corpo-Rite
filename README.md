# CorpoRite

Chrome extension that watches what you type in **Hinglish** (or informal Indian English) on any website and suggests **professional corporate English** in real time. Accept a suggestion with one click to replace your text in place.

## Features

- Works on **any text field**: `<input>`, `<textarea>`, and `contenteditable` (Gmail, LinkedIn, Slack, Notion, etc.)
- **Manual shortcut** `Alt+Shift+C` to open suggestions (saves API tokens)
- **Optional auto-suggest** while typing (off by default)
- **Formality levels**: casual professional, professional, formal, executive
- **Keep original tone** toggle — preserve your voice vs. neutral corporate rewrite
- **Accept** replaces text; **Regenerate** tries again; **Ctrl+Enter** quick accept
- Rewrite **selection only** when text is highlighted

## Requirements

- Google Chrome (or Chromium-based browser)
- An [OpenAI API key](https://platform.openai.com/api-keys) (uses `gpt-4o-mini` by default for low cost)

## Install (developer mode)

1. Generate icons (once):

   ```bash
   node scripts/generate-icons.mjs
   ```

2. Open Chrome → **Extensions** → **Manage extensions** → enable **Developer mode**.

3. Click **Load unpacked** and select this folder (`CorpoRite`).

4. Click the CorpoRite toolbar icon → **Full settings & API key** → paste your OpenAI API key → **Save settings**.

## Usage

1. Go to any site with a text box.
2. Type in Hinglish, e.g. `Kal meeting postpone karni padegi, client ko inform kar dena`.
3. Press **Alt+Shift+C** for a suggestion (or enable auto-suggest while typing).
4. Click **Accept** (or **Ctrl+Enter**) to replace your text with the corporate English version.

Customize the shortcut at `chrome://extensions/shortcuts`.

## Settings

| Setting | Description |
|--------|-------------|
| Formality | How formal the output should be |
| Keep original tone | Preserve personality vs. neutral corporate voice |
| Suggestion delay | Ms to wait after typing stops |
| Minimum characters | Avoid suggestions on very short input |
| Model | OpenAI model (`gpt-4o-mini` recommended) |

## Privacy

- Your API key is stored in **Chrome sync storage** on your profile.
- Text is sent to **OpenAI** only when a suggestion is requested (after debounce).
- No third-party analytics server is included in this extension.

## Project structure

```
CorpoRite/
├── manifest.json
├── background.js          # OpenAI API calls
├── content/
│   ├── content.js         # Input detection + suggestion UI
│   └── content.css
├── popup/                 # Quick controls
├── options/               # Full settings page
├── shared/constants.js
└── icons/
```

## License

MIT — use and modify freely.
