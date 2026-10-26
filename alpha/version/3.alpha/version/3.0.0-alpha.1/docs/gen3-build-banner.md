# Generation 3 build banner artwork

The Generation 3 compiler banner reads its artwork from these plain-text files:

- `src/engine/plugins/banner/wordmark.txt` — the main NEXTJS ENGINE wordmark.
- `src/engine/plugins/banner/bottom-text.txt` — the optional bottom text/art. You can put multiple lines or multiple separate text-art blocks in this file; use an empty line to leave a gap between blocks.

Edit the files directly, keep the artwork characters and line breaks as you want them printed, then commit them with the source. Do not wrap the art in quotes or Markdown code fences.

The renderer reads the assets as UTF-8, preserves their content and internal blank lines, centers each line, and sizes the frame to the longest line across both files. The frame therefore grows or shrinks automatically when you change the art. The banner is printed in the terminal's character grid, so use characters with predictable single-column widths for precise alignment.

The distributable `main-3-package` branch mirrors the files to `engine/plugins/banner/` through the existing package-sync workflow.
