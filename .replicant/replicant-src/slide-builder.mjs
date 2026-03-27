/**
 * ============================================================
 *  slide-builder.mjs — Parse Markdown into presentation slides
 *  replicant-2049
 * ============================================================
 *
 *  Reads the tutorial Markdown and splits it into an ordered
 *  array of slide objects ready for rendering.
 *
 *  Slide types:
 *    cover          — Project cover (logo + title + meta)
 *    toc            — Table of contents
 *    section-title  — H2 section header (full-screen title card)
 *    content        — H3 subsection with text + optional image
 *    closing        — Final slide (thank you / contact)
 *
 * ============================================================
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve, extname } from 'path';

/**
 * Parse a Markdown tutorial into slides.
 *
 * @param {object} config  Resolved config from tutorial.config.js
 * @returns {object[]}     Array of slide objects
 */
export function buildSlides(config) {
  const md = readFileSync(config.input, 'utf8');
  const lines = md.split('\n');
  const imagesDir = config.imagesDir || dirname(config.input);
  const videoCfg = config.video || {};
  const defaultDuration = videoCfg.slideDuration || 6;

  const slides = [];

  // ── 1. Cover slide ───────────────────────────────────────────
  if (config.cover) {
    slides.push({
      type: 'cover',
      title: config.cover.title || 'Tutorial',
      subtitle: config.cover.subtitle || '',
      logo: config.cover.logo || null,
      version: config.cover.version || '',
      classification: config.cover.classification || '',
      footer: config.cover.footer || '',
      date: config.cover.date || null,
      meta: config.cover.meta || {},
      duration: videoCfg.coverDuration || 8,
    });
  }

  // ── 2. Parse Markdown sections ───────────────────────────────
  // Skip H1, skip TOC section, then split by H2/H3
  let currentSection = null;
  let currentSubsection = null;
  let buffer = [];
  let inToc = false;

  for (const line of lines) {
    // Skip H1 (title line)
    if (/^# [^#]/.test(line)) continue;

    // Detect and skip inline TOC
    if (/^## .*[ÍI]ndice/i.test(line)) {
      inToc = true;
      continue;
    }
    if (inToc) {
      if (/^## /.test(line) && !/[ÍI]ndice/i.test(line)) {
        inToc = false;
        // fall through to process this H2
      } else {
        continue;
      }
    }

    // Skip subtitle line
    if (/^## Guía completa/i.test(line)) continue;

    // H2 — Major section
    if (/^## /.test(line)) {
      // Flush previous subsection
      if (currentSubsection) {
        slides.push(finalizeContentSlide(currentSubsection, buffer, imagesDir, defaultDuration));
        buffer = [];
        currentSubsection = null;
      }

      const title = line.replace(/^## /, '').trim();
      currentSection = title;

      slides.push({
        type: 'section-title',
        title,
        sectionNumber: extractSectionNumber(title),
        duration: videoCfg.sectionTitleDuration || 4,
      });
      continue;
    }

    // H3 — Subsection
    if (/^### /.test(line)) {
      // Flush previous subsection
      if (currentSubsection) {
        slides.push(finalizeContentSlide(currentSubsection, buffer, imagesDir, defaultDuration));
        buffer = [];
      }

      const title = line.replace(/^### /, '').trim();
      currentSubsection = {
        type: 'content',
        title,
        parentSection: currentSection,
      };
      continue;
    }

    // Accumulate content lines
    buffer.push(line);
  }

  // Flush last subsection
  if (currentSubsection) {
    slides.push(finalizeContentSlide(currentSubsection, buffer, imagesDir, defaultDuration));
  }

  // ── 3. TOC slide (built from section-title slides) ───────────
  const sectionTitles = slides
    .filter((s) => s.type === 'section-title')
    .map((s) => s.title);

  if (sectionTitles.length > 0) {
    slides.splice(1, 0, {
      type: 'toc',
      title: config.tocTitle || 'Índice de Contenidos',
      items: sectionTitles,
      duration: videoCfg.tocDuration || 6,
    });
  }

  // ── 4. Closing slide ─────────────────────────────────────────
  slides.push({
    type: 'closing',
    title: config.cover?.footer || '',
    subtitle: config.cover?.title || 'Tutorial',
    duration: videoCfg.closingDuration || 6,
  });

  console.log(`  📊 Slides generados: ${slides.length} (${sectionTitles.length} secciones)`);
  return slides;
}

// ─── Helpers ───────────────────────────────────────────────────

function extractSectionNumber(title) {
  const match = title.match(/^(\d+)\./);
  return match ? match[1] : '';
}

function finalizeContentSlide(sub, buffer, imagesDir, defaultDuration) {
  const text = buffer.join('\n').trim();

  // Extract images
  const images = [];
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    const href = match[2];
    const resolved = resolveImage(href, imagesDir);
    if (resolved) {
      images.push({ alt: match[1], path: resolved });
    }
  }

  // Clean text: remove image lines, metadata lines
  const cleanText = text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')          // remove images
    .replace(/^\*\*Versión:\*\*.*/gm, '')             // remove meta
    .replace(/^\*\*Clasificación:\*\*.*/gm, '')
    .replace(/^---$/gm, '')                           // remove hr
    .replace(/\n{3,}/g, '\n\n')                       // collapse blank lines
    .trim();

  // Extract bullet points
  const bullets = [];
  const bulletRegex = /^[-*]\s+(.+)$/gm;
  let bMatch;
  while ((bMatch = bulletRegex.exec(cleanText)) !== null) {
    bullets.push(bMatch[1].trim());
  }

  // Extract numbered steps
  const steps = [];
  const stepRegex = /^\d+\.\s+(.+)$/gm;
  let sMatch;
  while ((sMatch = stepRegex.exec(cleanText)) !== null) {
    steps.push(sMatch[1].trim());
  }

  // Prose paragraphs (non-list, non-empty lines)
  const prose = cleanText
    .split('\n')
    .filter((l) => l.trim() && !/^[-*]\s/.test(l) && !/^\d+\.\s/.test(l) && !/^>/.test(l) && !/^```/.test(l) && !/^#+\s/.test(l))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Determine how many images — extra duration if multiple
  const imageDuration = images.length > 1 ? defaultDuration + 2 : defaultDuration;

  return {
    ...sub,
    text: cleanText,
    prose: prose.length > 200 ? prose.substring(0, 200) + '…' : prose,
    bullets,
    steps,
    images,
    duration: imageDuration,
  };
}

function resolveImage(href, imagesDir) {
  const candidates = [
    join(imagesDir, href),
    resolve(href),
  ];
  if (href.startsWith('SS/')) {
    candidates.unshift(join(dirname(imagesDir), href));
  }
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}
