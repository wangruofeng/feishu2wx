# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

feishu2wx is a pure frontend React application that converts Feishu (Lark) documents to WeChat Official Account article format. Users paste HTML from Feishu documents or write Markdown directly, then preview and copy formatted content to the WeChat editor.

## Common Commands

```bash
# Development (run from project root)
npm run install:frontend    # Install frontend dependencies
npm start                   # Start dev server on port 3000
npm run pre-commit-check    # Run pre-commit checks (version & docs)

# Development (run from frontend/ directory)
cd frontend
npm start                   # Start dev server with hot reload
npm run build              # Production build to frontend/build/
npm test                   # Run tests
npm run deploy             # Deploy to GitHub Pages (using gh-pages)
```

## Architecture

### Data Flow

```
Feishu HTML Paste → convertHtmlToMarkdown() → Markdown State
                                              ↓
                              renderMarkdown() → HTML Preview
                                              ↓
                              formatForWeChat() → Inline-styled HTML → Clipboard
```

1. **Input**: User pastes HTML (detected via `onPaste` in EditorPane) or types Markdown
2. **Conversion**: `htmlToMarkdown.ts` converts HTML to Markdown using Turndown with custom rules for Feishu-specific elements
3. **Rendering**: `markdownRenderer.ts` converts Markdown to HTML with syntax highlighting via highlight.js
4. **Output**: `wechatCopy.ts` applies inline styles (theme colors, fonts) for WeChat compatibility and copies to clipboard

### Key Utilities

**`frontend/src/utils/htmlToMarkdown.ts`**
- Converts HTML to Markdown using Turndown + GFM plugin
- Custom rules for Feishu-specific elements:
  - `feishuCodeBlock`: Handles `data-language` attribute and code block divs
  - `feishuHighlight`: Converts highlighted backgrounds to `==text==` Markdown syntax
- Strips `<script>`, `<style>`, and HTML comments

**`frontend/src/utils/markdownRenderer.ts`**
- Renders Markdown to HTML using markdown-it
- Syntax highlighting with highlight.js (Atom One Dark theme)
- Custom code block wrapper with language label header
- All links open in new tabs (`target="_blank"`)
- Custom `<hr>` class for gradient divider styling

**`frontend/src/utils/wechatCopy.ts`**
- `formatForWeChat()`: Converts preview HTML to WeChat-compatible format
  - Applies theme colors inline (WeChat doesn't support external CSS)
  - Handles all element types: headings, paragraphs, lists, quotes, tables, code blocks, images
  - List items: unwraps `li > p` and wraps each `li`'s content in a single `span` so the WeChat editor does not split "first child" + "rest" into separate lines (avoids unwanted line break after bold label)
  - Uses `px` units (better compatibility than `em`)
  - Special gradient divider via `linear-gradient`
- `copyHtmlToWeChat()`: Copies formatted HTML to clipboard
  - Primary: Clipboard API `write()` with ClipboardItem (text/html + text/plain)
  - Fallback: `document.execCommand('copy')` with contenteditable div
  - Returns detailed success/error messages for user

### Theme System

8 built-in themes defined in `getThemeStyles()`:
- green, light, dark, classic, purple, orange, pink, blue, red, cyan

Each theme defines:
- `primaryColor`, `primaryColorDark`
- `headingColor`, `headingColorH2`
- `linkColor`
- `blockquoteBorderColor`, `blockquoteBgColor`
- `tableHeaderBgColor`, `tableHeaderColor`

Theme styles are applied:
1. In preview via CSS classes (`frontend/src/styles/themes.css`)
2. In WeChat output via inline styles in `formatForWeChat()`

Dark mode auto-detection via `window.matchMedia('(prefers-color-scheme: dark)')`.

### Font System

16 font options in `getFontFamily()`:
- System fonts: default, microsoft-yahei, simsun, simhei, arial, helvetica, times, georgia, verdana, courier
- Google Fonts: roboto, open-sans, lato, montserrat, raleway, poppins

Fonts are loaded via Google Fonts CDN in `public/index.html`.

### State Management (App.tsx)

- `markdown`: Current Markdown content
- `html`: Rendered HTML preview of the current markdown
- `theme`: Selected theme (default: 'classic')
- `font`: Selected font (default: 'default')
- `showEditor`: Toggle editor visibility
- `devicePreview`: 'desktop' | 'mobile' - affects preview width
- `isFullscreen`: Fullscreen preview mode
- `showH1`: Toggle H1 bottom border display (default: true)
- `imageBorderStyle`: Toggle between 'border' and 'shadow' mode for images (default: 'border')
- `codeBlockStyle`: `'classic' | 'modern'` - code block visual style in preview (default: `'modern'`)
- `htmlPasteDetected`: Shows modal when HTML paste is detected

### Component Structure

- `App.tsx`: Main container, manages all state, handles keyboard shortcuts (ESC for fullscreen)
- `EditorPane.tsx`: Textarea with toolbar, detects HTML paste via clipboard API, supports local .md file import
- `PreviewPane.tsx`: Renders HTML output, device-specific width styling
- `Toolbar.tsx`: Bottom action buttons (copy, fullscreen, editor toggle, theme/font selectors)
- `ThemeSwitcher.tsx`, `FontSelector.tsx`, `DevicePreviewToggle.tsx`: Settings UI

## Important Implementation Details

### Feishu HTML Detection

EditorPane detects HTML paste via:
```typescript
const items = e.clipboardData?.items;
for (let item of items) {
  if (item.type === 'text/html') {
    item.getAsString((html) => {
      if (html.includes('feishu') || html.includes('larksuite')) {
        // Show modal to confirm conversion
      }
    });
  }
}
```

### WeChat Compatibility Constraints

- All styles must be inline (no external CSS)
- Use `px` units, not `em` or `rem`
- Avoid complex HTML structures (no absolute positioning)
- Tables need `border-collapse: collapse`
- Images need `display: block` and `max-width: 100%`
- Code blocks keep a simple layout, but syntax highlighting colors are inlined so that WeChat preserves as much highlighting as possible

### Code Block Styling

Two different treatments:
1. **Preview**:
   - Full syntax highlighting with highlight.js (Atom One Dark theme)
   - Two styles:
     - `classic`: light background, simple `pre > code` blocks
     - `modern` (default): dark "code window" with 3 colored dots header and sticky top bar, horizontally scrollable content
2. **WeChat output**:
   - Uses the rendered HTML from the preview and converts highlight.js classes into inline styles via `convertHighlightClassesToInlineStyles`
   - Attempts to preserve syntax highlighting colors and font styles while keeping layout simple and WeChat‑friendly

### H1 Bottom Border Toggle

Users can show/hide the bottom border on H1 headings:
- **Preview**: Controlled via CSS class `.hide-h1` applied to preview container
- **WeChat output**: Conditionally applied `borderBottom` style in `formatForWeChat()`
- State: `showH1` (default: true)
- Button: "👁️ 隐藏 H1 底线" / "📝 显示 H1 底线"

### Image Style Toggle

Users can switch between border and shadow modes for images:
- **Border mode** (default): `border: 0.5px solid #e0e0e0`, no shadow
- **Shadow mode**: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05)`, no border
- **Preview**: Controlled via CSS class `.image-shadow` on preview container
- **WeChat output**: Conditionally applied inline styles in `formatForWeChat()`
- State: `imageBorderStyle` (default: 'border')
- Button: "🖼️ 边框模式" / "🌫️ 阴影模式"

## Testing Changes

When modifying rendering logic:
1. Test with various Markdown inputs (headings, lists, code blocks, tables, quotes)
2. Test HTML paste from Feishu documents
3. Verify theme switching applies correctly in preview
4. Verify copy to WeChat preserves inline styles
5. Test on mobile viewport (device preview toggle)

## Deployment

- Build output: `frontend/build/`
- GitHub Pages deployment via `gh-pages` package
- Homepage set in `frontend/package.json`: `"homepage": "."`
- Deploy command: `cd frontend && npm run deploy`

## Development Workflow

### File Import Feature

EditorPane supports importing local Markdown files:
- Click "📁 导入文件" button in the editor header
- Select any `.md` file from your local system
- File content is automatically loaded into the editor
- Useful for importing Markdown from Cursor, VS Code, or other editors

### Smart Paste Detection

The editor intelligently handles paste operations:
- **Feishu/Lark**: HTML is automatically converted to Markdown using custom rules
- **Cursor/VS Code**: Plain text Markdown is used directly (no double conversion)
- **Other sources**: Falls back to plain text

Detection logic checks for feishu/larksuite/lark keywords in HTML clipboard data.

### Pre-commit Checks

The project uses Husky for Git hooks that automatically run checks before each commit:

**Checks performed**:
1. **Version number verification**: Ensures `frontend/package.json` version is updated
2. **Documentation update reminder**: Prompts to update docs if source code changed

**Run manually**:
```bash
npm run pre-commit-check
```

**Bypass checks** (if needed):
```bash
git commit --no-verify -m "message"
```

See `scripts/PRE_COMMIT_CHECK.md` for details.

### Version Management

- Follow Semantic Versioning: `MAJOR.MINOR.PATCH`
- Version defined in `frontend/package.json`
- Pre-commit hook prevents commits without version updates
- Typical workflow:
  1. Make code changes
  2. Update version (e.g., 1.3.0 → 1.4.0)
  3. Update documentation if needed
  4. Run `npm run pre-commit-check` (optional - runs automatically on commit)
  5. Commit - Husky runs checks automatically
