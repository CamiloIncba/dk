/**
 * shadcn-dark-video — Video slide theme
 *
 * 1920×1080 presentation slides.
 * Dark cover & section-title slides, light content slides.
 * Designed for 144fps smooth animations.
 */

const CSS = `
/* ── Slide base ── */
.slide {
  width: 1920px;
  height: 1080px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow: hidden;
  position: relative;
}

/* ══════════════════════════════════════════════════════════════
   Cover
   ══════════════════════════════════════════════════════════════ */
.slide-cover {
  background: #09090b;
  color: #fafafa;
}

.cover-card {
  border: 1px solid #27272a;
  border-radius: 16px;
  background: #0a0a0a;
  padding: 60px 72px;
  max-width: 680px;
  width: 100%;
  text-align: center;
}

.cover-logo {
  max-width: 280px;
  height: auto;
  margin-bottom: 28px;
}

.cover-divider {
  width: 100%;
  height: 1px;
  background: #27272a;
  margin: 28px 0;
}

.cover-title {
  font-size: 42px;
  font-weight: 600;
  color: #fafafa;
  margin: 0 0 12px 0;
  line-height: 1.25;
  letter-spacing: -0.5px;
}

.cover-subtitle {
  font-size: 20px;
  color: #a1a1aa;
  line-height: 1.5;
  margin: 0 auto 32px auto;
  max-width: 520px;
}

.cover-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 16px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #18181b;
}

.meta-label {
  color: #a1a1aa;
  font-weight: 500;
}

.meta-value {
  color: #d4d4d8;
}

.cover-footer {
  position: absolute;
  bottom: 48px;
  font-size: 15px;
  color: #52525b;
  letter-spacing: 0.5px;
}

/* ══════════════════════════════════════════════════════════════
   TOC
   ══════════════════════════════════════════════════════════════ */
.slide-toc {
  background: #fafafa;
  color: #0f172a;
  padding: 80px 140px;
  align-items: flex-start;
  justify-content: flex-start;
}

.toc-heading {
  font-size: 40px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 36px 0;
  padding-bottom: 12px;
  border-bottom: 4px solid #3b82f6;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  columns: 2;
  column-gap: 80px;
  width: 100%;
}

.toc-list li {
  font-size: 22px;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
  color: #334155;
  break-inside: avoid;
}

/* ══════════════════════════════════════════════════════════════
   Section Title
   ══════════════════════════════════════════════════════════════ */
.slide-section-title {
  background: #09090b;
  color: #fafafa;
  text-align: center;
  gap: 20px;
}

.section-number {
  font-size: 120px;
  font-weight: 800;
  color: #27272a;
  line-height: 1;
  letter-spacing: -4px;
}

.section-heading {
  font-size: 48px;
  font-weight: 700;
  color: #fafafa;
  margin: 0;
  line-height: 1.2;
  max-width: 900px;
}

.section-line {
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  border-radius: 2px;
  max-width: 300px;
  margin-top: 8px;
}

/* ══════════════════════════════════════════════════════════════
   Content
   ══════════════════════════════════════════════════════════════ */
.slide-content {
  background: #fafafa;
  color: #1e293b;
  padding: 64px 80px;
}

.layout-split {
  flex-direction: row;
  justify-content: space-between;
  align-items: stretch;
  gap: 48px;
}

.layout-text-only {
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
}

.content-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.layout-split .content-text {
  max-width: 45%;
}

.layout-text-only .content-text {
  max-width: 85%;
}

.content-title {
  font-size: 36px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 24px 0;
  line-height: 1.2;
  border-left: 5px solid #3b82f6;
  padding-left: 20px;
}

.content-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.content-list li {
  font-size: 22px;
  line-height: 1.6;
  padding: 6px 0;
  color: #334155;
}

.content-list li strong {
  color: #0f172a;
  font-weight: 600;
}

.content-list li code {
  background: #e2e8f0;
  color: #be185d;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.9em;
}

.content-prose {
  font-size: 22px;
  line-height: 1.7;
  color: #475569;
  margin: 0;
}

.content-image {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.layout-split .content-image {
  max-width: 52%;
}

.content-image img {
  max-width: 100%;
  max-height: 880px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  object-fit: contain;
}

/* ══════════════════════════════════════════════════════════════
   Closing
   ══════════════════════════════════════════════════════════════ */
.slide-closing {
  background: #09090b;
  color: #fafafa;
  text-align: center;
}

.closing-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.closing-title {
  font-size: 36px;
  font-weight: 600;
  color: #fafafa;
  margin: 0;
  line-height: 1.3;
}

.closing-divider {
  width: 120px;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #06b6d4);
  border-radius: 2px;
}

.closing-footer {
  font-size: 18px;
  color: #71717a;
  margin: 0;
}

.closing-thanks {
  font-size: 52px;
  font-weight: 800;
  color: #fafafa;
  margin: 24px 0 0 0;
  letter-spacing: -1px;
}
`;

export default CSS;
