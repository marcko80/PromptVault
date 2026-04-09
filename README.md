# PromptVault

> Save, organize, and inject your AI prompts directly into Claude, ChatGPT, Gemini, Perplexity, and Mistral.

PromptVault is a Chrome Extension (Manifest V3) that lets you manage your personal library of AI prompts. Create custom categories, search instantly, and inject prompts with one click into the active AI platform — no copy-paste needed.

---

## Features

- **One-click injection** — Injects the selected prompt directly into the textarea of the active AI platform (Claude, ChatGPT, Gemini, Perplexity, Mistral). Falls back to clipboard if the content script is not loaded.
- **Dynamic categories** — Create, rename, and delete your own categories. Categories are auto-generated when you save a prompt with a new category name.
- **Real-time search** — Filter prompts by title, content, tags, or category as you type.
- **AI model filter** — Chip row to filter prompts by target model (Claude, ChatGPT, Gemini, etc.).
- **Category filter** — Separate chip row to filter by category.
- **Usage counter** — Tracks how many times each prompt has been used.
- **Import / Export** — Backup and restore your prompts as JSON. Supports both flat array and `{prompts, categories}` formats.
- **Statistics** — View total prompts, total uses, and category breakdown in the Settings panel.
- **Dark amber theme** — Sleek dark UI with Sora + JetBrains Mono fonts.
- **Keyboard shortcut** — `Ctrl+Shift+P` to open the extension popup.
- **100% local storage** — All data stays in your browser via `chrome.storage.local`. No server, no account, no tracking.

---

## Supported Platforms

| Platform | Injection | URL |
|---|---|---|
| Claude | `execCommand('insertText')` via ProseMirror | `claude.ai` |
| ChatGPT | Native textarea value + input event | `chatgpt.com` |
| Gemini | ContentEditable div | `gemini.google.com` |
| Perplexity | Textarea | `perplexity.ai` |
| Mistral | Textarea | `chat.mistral.ai` |

---

## Installation

### From source (Developer Mode)

1. Clone this repository or download the ZIP
2. Extract into a folder (e.g. `prompt-vault/`)
3. Open Chrome and navigate to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top right)
5. Click **Load unpacked** and select the `prompt-vault/` folder
6. The PromptVault icon appears in your toolbar

### From Chrome Web Store

> Coming soon — the extension is currently in review.

---

## File Structure

```
prompt-vault/
├── manifest.json          # Manifest V3 configuration
├── background.js          # Service worker + default prompts
├── content_script.js      # Injection engine for supported platforms
├── popup.html             # Extension popup UI
├── popup.js               # CRUD, search, filter, inject, import/export logic
├── popup.css              # Dark amber theme styles
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How It Works

1. Click the PromptVault icon (or press `Ctrl+Shift+P`)
2. Search or browse your prompts by category or AI model
3. Click **Inject** — the prompt is inserted into the active AI chat
4. If the content script is not ready, the prompt is copied to your clipboard with a notification

The extension detects which AI platform is active and shows a contextual button like "Inject in Claude" or "Inject in ChatGPT".

---

## Category Management

- Categories are created automatically when you type a new category name in the prompt form
- Manage categories in **Settings**: rename, delete, or create empty categories
- The category input field suggests existing categories via datalist autocomplete
- Deleting a category removes the label from associated prompts (prompts are not deleted)

---

## Import / Export

- **Export**: Downloads a JSON file with all your prompts and categories
- **Import**: Accepts both formats:
  - Flat array: `[{prompt}, {prompt}, ...]`
  - Object: `{"prompts": [...], "categories": [...]}`

---

## Privacy

PromptVault stores all data locally using `chrome.storage.local`. No data is transmitted to any server. No analytics, no tracking, no account required.

---

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` + `scripting` | Required to inject the selected prompt into the active AI platform's text field |
| `storage` | Saves prompts locally in the browser |
| `clipboardWrite` | Fallback: copies the prompt to clipboard if direct injection is unavailable |
| `host_permissions` | Limited to supported AI platform domains only |

---

## Roadmap

- [ ] Prompt variables / placeholders (`[PLACEHOLDER]` auto-fill before injection)
- [ ] Pinned prompts (favorites always on top)
- [ ] Duplicate prompt (clone and edit)
- [ ] Sub-categories
- [ ] Collections (cross-category groupings)
- [ ] Auto-tagging via AI
- [ ] Cloud sync with Supabase
- [ ] Team workspace / shared prompt library
- [ ] Context menu integration (right-click to save selected text as prompt)
- [ ] Firefox and Safari support

---

## Tech Stack

- **Manifest V3** — Modern Chrome Extension architecture
- **Vanilla JavaScript** — No frameworks, no dependencies
- **chrome.storage.local** — Persistent local storage with sync capability
- **Content Scripts** — Platform-specific injection for each supported AI tool

---

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Author

**Marco** — [@marcko80](https://github.com/marcko80)

---

> *Built with passion for the AI community.*
