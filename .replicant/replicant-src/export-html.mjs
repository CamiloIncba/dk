/**
 * ============================================================
 *  export-html.mjs — Markdown → HTML fragment for in-app embedding
 *  Replicant-2049
 * ============================================================
 *
 *  Generates a standalone HTML file with the tutorial content,
 *  designed to be fetched and injected into a React/Vue/etc app.
 *
 *  Images are referenced as relative paths (not base64) so the
 *  host app can serve them from its own static assets.
 *
 *  Usage:
 *    import { exportTutorialToHTML } from './export-html.mjs';
 *    await exportTutorialToHTML(config);
 *
 * ============================================================
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

/**
 * Process Markdown into HTML, keeping image paths as relative URLs.
 * Images are referenced as `./SS/filename.png` so the host app
 * can serve them from the same directory as the HTML.
 */
function processMarkdownForWeb(mdContent, imagesDir) {
  const missingImages = [];
  let imageCount = 0;
  let foundCount = 0;

  marked.use({
    renderer: {
      heading({ text, depth, raw }) {
        const cleanText = raw
          .replace(/[^\w\sáéíóúñü.-]/gi, '')
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
        const id = `section-${cleanText}`;
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },
      image({ href, title, text }) {
        imageCount++;

        // Resolve to check existence
        const candidates = [
          join(imagesDir, href),
          resolve(href),
        ];
        if (href.startsWith('SS/')) {
          candidates.unshift(join(dirname(imagesDir), href));
        }

        const exists = candidates.some((c) => existsSync(c));
        if (exists) {
          foundCount++;
        } else {
          missingImages.push(href);
        }

        // Keep the original relative path — the host app serves these
        const alt = text || title || '';
        const imgSrc = href.startsWith('SS/') ? href : `SS/${basename(href)}`;
        return `<figure class="tutorial-figure">
  <img src="${imgSrc}" alt="${alt}" loading="lazy" class="tutorial-screenshot" />
  ${alt ? `<figcaption>${alt}</figcaption>` : ''}
</figure>`;
      },
    },
  });

  let html = marked.parse(mdContent);

  // Remove H1 title (shown separately in the app header)
  html = html.replace(/<h1[^>]*>.*?<\/h1>/i, '');

  // Remove inline subtitle
  html = html.replace(/<h2[^>]*>Guía completa.*?<\/h2>/i, '');

  // Remove inline TOC from MD (the app renders its own TOC sidebar)
  const idxMatch = html.match(/<h2[^>]*>.*?[ÍI]ndice.*?<\/h2>/i);
  if (idxMatch) {
    const startPos = html.indexOf(idxMatch[0]);
    const afterToc = html.indexOf('<h2', startPos + idxMatch[0].length);
    if (afterToc > startPos) {
      html = html.substring(0, startPos) + html.substring(afterToc);
    }
  }

  return { html, imageCount, foundCount, missingImages };
}

/**
 * Extract TOC entries from the processed HTML.
 * Returns a JSON array of { level, id, text } objects.
 */
function extractTOC(htmlContent) {
  const headingRegex = /<h([23])\s*id="([^"]*)"[^>]*>(.*?)<\/h[23]>/gi;
  const items = [];
  let match;

  while ((match = headingRegex.exec(htmlContent)) !== null) {
    const level = parseInt(match[1]);
    const id = match[2];
    const text = match[3].replace(/<[^>]+>/g, '');
    items.push({ level, id, text });
  }

  return items;
}

/**
 * Copy all images from imagesDir to the output directory.
 */
function copyImages(imagesDir, outputDir) {
  const ssOutputDir = join(outputDir, 'SS');
  if (!existsSync(ssOutputDir)) {
    mkdirSync(ssOutputDir, { recursive: true });
  }

  if (!existsSync(imagesDir)) {
    console.warn(`  WARN: Images directory not found: ${imagesDir}`);
    return 0;
  }

  const files = readdirSync(imagesDir).filter((f) => {
    const ext = extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp'].includes(ext);
  });

  for (const file of files) {
    copyFileSync(join(imagesDir, file), join(ssOutputDir, file));
  }

  return files.length;
}

/**
 * Export tutorial as HTML fragment + TOC JSON + images.
 *
 * Output structure:
 *   outputDir/
 *     tutorial-content.html   — HTML fragment (no <html>/<body> wrapper)
 *     tutorial-toc.json       — Array of { level, id, text }
 *     tutorial-meta.json      — { title, version, generatedAt, imageCount }
 *     SS/                     — Screenshot images (copied)
 *
 * @param {Object} config — Resolved config from cli.mjs
 * @param {Object} [options] — Extra options
 * @param {string} [options.outputDir] — Override output directory
 */
export async function exportTutorialToHTML(config, options = {}) {
  console.log('\n========================================');
  console.log('  Exportando Tutorial a HTML (in-app)');
  console.log('========================================');

  if (!existsSync(config.input)) {
    console.error('  ❌ Markdown not found: ' + config.input);
    return null;
  }

  // Determine output directory
  const outputDir = options.outputDir
    || config.htmlOutputDir
    || dirname(config.output);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log('  Origen:    ' + config.input);
  console.log('  Destino:   ' + outputDir);

  const mdContent = readFileSync(config.input, 'utf8');
  console.log('  Markdown:  ' + mdContent.split('\n').length + ' líneas');

  // Process markdown to HTML with relative image paths
  console.log('  Procesando Markdown...');
  const { html, imageCount, foundCount, missingImages } = processMarkdownForWeb(
    mdContent,
    config.imagesDir
  );

  // Extract TOC
  const toc = extractTOC(html);

  // Copy images
  console.log('  Copiando imágenes...');
  const copiedCount = copyImages(config.imagesDir, outputDir);
  console.log(`  Imágenes: ${foundCount}/${imageCount} disponibles, ${copiedCount} copiadas`);

  if (missingImages.length > 0) {
    for (const img of missingImages) {
      console.warn('  WARN: Image not found: ' + img);
    }
  }

  // Build metadata
  const meta = {
    title: config.cover?.title?.replace(/\n/g, ' ') || 'Tutorial',
    subtitle: config.cover?.subtitle || '',
    version: config.cover?.version || '',
    generatedAt: new Date().toISOString(),
    imageCount,
    tocEntries: toc.length,
    sourceLines: mdContent.split('\n').length,
  };

  // Write files
  const htmlPath = join(outputDir, 'tutorial-content.html');
  const tocPath = join(outputDir, 'tutorial-toc.json');
  const metaPath = join(outputDir, 'tutorial-meta.json');

  writeFileSync(htmlPath, html, 'utf8');
  writeFileSync(tocPath, JSON.stringify(toc, null, 2), 'utf8');
  writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  console.log('  ✅ HTML exportado:');
  console.log('     📄 ' + htmlPath);
  console.log('     📋 ' + tocPath + ` (${toc.length} entries)`);
  console.log('     📊 ' + metaPath);
  console.log('     🖼️  ' + join(outputDir, 'SS/') + ` (${copiedCount} images)`);
  console.log('========================================\n');

  return { htmlPath, tocPath, metaPath, outputDir };
}
