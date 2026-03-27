/**
 * ============================================================
 *  slide-renderer.mjs — Render slides to HTML for Playwright
 *  replicant-2049
 * ============================================================
 *
 *  Each slide type has its own HTML template.
 *  Returns a full HTML page string ready for Playwright rendering.
 *
 * ============================================================
 */

import { readFileSync, existsSync } from 'fs';
import { extname, resolve } from 'path';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// ─── Load video theme CSS ──────────────────────────────────────
async function loadVideoThemeCSS(theme) {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  if (theme && (theme.endsWith('.css') || theme.endsWith('.mjs'))) {
    if (theme.endsWith('.css')) {
      return readFileSync(resolve(theme), 'utf8');
    }
    const mod = await import(pathToFileURL(resolve(theme)).href);
    return mod.default || mod.CSS;
  }

  const themeName = (theme || 'shadcn-dark') + '-video';
  const themePath = join(__dirname, 'themes', `${themeName}.mjs`);

  if (!existsSync(themePath)) {
    console.warn(`  WARN: Video theme "${themeName}" not found, using shadcn-dark-video`);
    const fallback = join(__dirname, 'themes', 'shadcn-dark-video.mjs');
    const mod = await import(pathToFileURL(fallback).href);
    return mod.default || mod.CSS;
  }

  const mod = await import(pathToFileURL(themePath).href);
  return mod.default || mod.CSS;
}

// ─── Image → base64 data URI ──────────────────────────────────
function imgToBase64(imgPath) {
  if (!imgPath || !existsSync(imgPath)) return null;
  const buf = readFileSync(imgPath);
  const ext = extname(imgPath).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.svg' ? 'image/svg+xml'
    : 'image/png';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

// ─── Render a single slide to HTML ─────────────────────────────
function renderSlide(slide, animationPhase) {
  // animationPhase: 0.0 (start) → 1.0 (fully revealed)
  const phase = animationPhase ?? 1;

  switch (slide.type) {
    case 'cover':
      return renderCover(slide, phase);
    case 'toc':
      return renderTOC(slide, phase);
    case 'section-title':
      return renderSectionTitle(slide, phase);
    case 'content':
      return renderContent(slide, phase);
    case 'closing':
      return renderClosing(slide, phase);
    default:
      return `<div class="slide"><p>Unknown slide type: ${slide.type}</p></div>`;
  }
}

// ─── Cover ─────────────────────────────────────────────────────
function renderCover(slide, phase) {
  const logoSrc = slide.logo ? imgToBase64(slide.logo) : null;
  const logoHTML = logoSrc
    ? `<img class="cover-logo" src="${logoSrc}" alt="" style="opacity:${Math.min(phase * 2, 1)}" />`
    : '';

  const titleOpacity = Math.max(0, Math.min((phase - 0.2) * 2, 1));
  const subtitleOpacity = Math.max(0, Math.min((phase - 0.4) * 2, 1));
  const metaOpacity = Math.max(0, Math.min((phase - 0.6) * 2, 1));

  const today = new Date();
  const dateStr = slide.date || today.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });

  let metaRows = '';
  if (slide.version) metaRows += `<div class="meta-row"><span class="meta-label">Versión</span><span class="meta-value">${slide.version}</span></div>`;
  metaRows += `<div class="meta-row"><span class="meta-label">Fecha</span><span class="meta-value">${dateStr}</span></div>`;
  if (slide.classification) metaRows += `<div class="meta-row"><span class="meta-label">Clasificación</span><span class="meta-value">${slide.classification}</span></div>`;

  return `
    <div class="slide slide-cover">
      <div class="cover-card">
        ${logoHTML}
        <div class="cover-divider" style="opacity:${titleOpacity}"></div>
        <h1 class="cover-title" style="opacity:${titleOpacity}">${slide.title.replace(/\n/g, '<br>')}</h1>
        ${slide.subtitle ? `<p class="cover-subtitle" style="opacity:${subtitleOpacity}">${slide.subtitle}</p>` : ''}
        <div class="cover-divider" style="opacity:${metaOpacity}"></div>
        <div class="cover-meta" style="opacity:${metaOpacity}">
          ${metaRows}
        </div>
      </div>
      ${slide.footer ? `<div class="cover-footer" style="opacity:${metaOpacity}">${slide.footer}</div>` : ''}
    </div>`;
}

// ─── TOC ───────────────────────────────────────────────────────
function renderTOC(slide, phase) {
  const items = slide.items
    .map((item, i) => {
      const itemPhase = Math.max(0, Math.min((phase - i * 0.03) * 3, 1));
      return `<li style="opacity:${itemPhase};transform:translateX(${(1 - itemPhase) * 30}px)">${item}</li>`;
    })
    .join('\n');

  return `
    <div class="slide slide-toc">
      <h2 class="toc-heading">${slide.title}</h2>
      <ul class="toc-list">
        ${items}
      </ul>
    </div>`;
}

// ─── Section title ─────────────────────────────────────────────
function renderSectionTitle(slide, phase) {
  const numOpacity = Math.min(phase * 3, 1);
  const titleOpacity = Math.max(0, Math.min((phase - 0.15) * 2.5, 1));
  const lineWidth = Math.min(phase * 2, 1) * 100;

  return `
    <div class="slide slide-section-title">
      ${slide.sectionNumber ? `<span class="section-number" style="opacity:${numOpacity}">${slide.sectionNumber}</span>` : ''}
      <h2 class="section-heading" style="opacity:${titleOpacity}">${slide.title}</h2>
      <div class="section-line" style="width:${lineWidth}%"></div>
    </div>`;
}

// ─── Content slide ─────────────────────────────────────────────
function renderContent(slide, phase) {
  const hasImage = slide.images && slide.images.length > 0;
  const layoutClass = hasImage ? 'layout-split' : 'layout-text-only';

  // Title
  const titleHTML = `<h3 class="content-title" style="opacity:${Math.min(phase * 3, 1)}">${slide.title}</h3>`;

  // Text content: prefer steps > bullets > prose
  let textHTML = '';
  const items = slide.steps.length > 0 ? slide.steps : slide.bullets;

  if (items.length > 0) {
    const listItems = items
      .map((item, i) => {
        const itemPhase = Math.max(0, Math.min((phase - 0.15 - i * 0.04) * 3, 1));
        const tag = slide.steps.length > 0 ? `${i + 1}. ` : '• ';
        // Strip markdown bold/code for cleaner display
        const clean = item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
        return `<li style="opacity:${itemPhase};transform:translateY(${(1 - itemPhase) * 15}px)">${tag}${clean}</li>`;
      })
      .join('\n');
    textHTML = `<ul class="content-list">${listItems}</ul>`;
  } else if (slide.prose) {
    const prosePhase = Math.max(0, Math.min((phase - 0.2) * 2, 1));
    const clean = slide.prose.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    textHTML = `<p class="content-prose" style="opacity:${prosePhase}">${clean}</p>`;
  }

  // Image
  let imageHTML = '';
  if (hasImage) {
    const imgSrc = imgToBase64(slide.images[0].path);
    if (imgSrc) {
      const imgPhase = Math.max(0, Math.min((phase - 0.3) * 2, 1));
      imageHTML = `<div class="content-image" style="opacity:${imgPhase};transform:scale(${0.95 + imgPhase * 0.05})">
        <img src="${imgSrc}" alt="${slide.images[0].alt || ''}" />
      </div>`;
    }
  }

  return `
    <div class="slide slide-content ${layoutClass}">
      <div class="content-text">
        ${titleHTML}
        ${textHTML}
      </div>
      ${imageHTML}
    </div>`;
}

// ─── Closing ───────────────────────────────────────────────────
function renderClosing(slide, phase) {
  return `
    <div class="slide slide-closing">
      <div class="closing-content" style="opacity:${Math.min(phase * 2, 1)}">
        <h2 class="closing-title">${slide.subtitle}</h2>
        <div class="closing-divider"></div>
        <p class="closing-footer">${slide.title}</p>
        <p class="closing-thanks">¡Gracias!</p>
      </div>
    </div>`;
}

// ─── Build full HTML page ──────────────────────────────────────
/**
 * Build a full HTML page for a single slide at a given animation phase.
 *
 * @param {object} slide          Slide object from buildSlides()
 * @param {number} animationPhase 0.0 → 1.0
 * @param {string} css            Theme CSS string
 * @param {object} resolution     { width, height }
 * @returns {string}              Full HTML document
 */
export function renderSlideHTML(slide, animationPhase, css, resolution) {
  const w = resolution?.width || 1920;
  const h = resolution?.height || 1080;
  const body = renderSlide(slide, animationPhase);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${w}, height=${h}">
  <style>
    ${css}
    html, body {
      margin: 0;
      padding: 0;
      width: ${w}px;
      height: ${h}px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

export { loadVideoThemeCSS };
