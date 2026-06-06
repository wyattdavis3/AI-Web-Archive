# AI Web Archive

Turn any webpage into AI-ready HTML, Markdown and Text.

## Features

- Extract readable content
- Export Markdown
- Export Clean HTML
- Export Plain Text
- Generate Capture Reports

## Why

Most web clipping tools are designed for humans.

AI Web Archive is designed for AI.

It converts webpages into formats that are easier for LLMs to process and analyze.

## Installation

### 1. Build the Extension

```bash
npm install
npm run build
```

### 2. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Usage

1. Navigate to any webpage
2. Click the AI Web Archive icon in your browser toolbar
3. Wait for the page to be analyzed
4. Choose your export format:
   - HTML: Clean, AI-optimized HTML
   - Markdown: Well-formatted Markdown
   - TXT: Plain text
   - Download All: Download all formats plus capture report

## Roadmap

- [x] HTML Export
- [x] Markdown Export
- [x] Text Export
- [ ] AI Summary
- [ ] Token Estimation
- [ ] Obsidian Export
- [ ] Anki Export

## Tech Stack

- Chrome Extension Manifest V3
- TypeScript
- Vite
- Mozilla Readability
- Turndown

## License

MIT
