# AI Web Archive

Archive the web for AI.

Save any webpage and export it as:
- HTML
- Markdown
- TXT

Ready for:
- ChatGPT
- Claude
- Gemini

## Features

- Raw Archive: Save complete webpage structure with minimal cleaning
- Readability Integration: Extract readable content intelligently
- Turndown Optimization: Convert HTML to clean Markdown
- Export Quality Validation: Check content retention rate
- Multiple Export Formats: HTML, Markdown, TXT
- Capture Reports: Generate JSON reports with export statistics
- Built-in Debug Center: Diagnose issues quickly

## Why

Most web clipping tools are designed for humans.

AI Web Archive is designed for AI.

It converts webpages into formats that are easier for LLMs to process and analyze.

## Screenshots

### Main Interface

![Main Interface](docs/images/main-interface.png)

Analyze webpage and export as:
- HTML
- Markdown
- TXT

Includes:
- Word statistics
- Retention analysis
- Image counting
- One-click export

### Debug Center

![Debug Center](docs/images/debug-center.png)

Built-in diagnostic center featuring:
- Environment checks
- Export logs
- Error tracking
- Analysis report generation

### Export Result

Coming Soon

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
   - HTML: Complete raw HTML with minimal cleaning
   - Markdown: Clean Markdown converted via Readability + Turndown
   - TXT: Plain text for maximum compatibility
   - Download All: Download all formats plus capture report

## Roadmap

- [x] HTML Export
- [x] Markdown Export
- [x] Text Export
- [x] Raw Archive Export
- [x] Export Quality Validation
- [x] Readability Integration
- [x] Turndown Optimization
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
