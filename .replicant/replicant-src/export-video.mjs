/**
 * ============================================================
 *  export-video.mjs — Hybrid video engine (slides + recordings)
 *  replicant-2049
 * ============================================================
 *
 *  Strategy:
 *    1. Load scene definitions (slide/recording mix)
 *    2. For slides: screenshot rendered HTML → static clip
 *    3. For recordings: Playwright recordVideo of live app
 *    4. FFmpeg concatenates all clips → final .mp4
 *
 * ============================================================
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, readdirSync, copyFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { spawn } from 'child_process';
import { buildSlides } from './slide-builder.mjs';
import { renderSlideHTML, loadVideoThemeCSS } from './slide-renderer.mjs';

// ─── Find FFmpeg binary ────────────────────────────────────────
let _ffmpegPath = null;
async function getFFmpegPath() {
  if (_ffmpegPath) return _ffmpegPath;
  try {
    const mod = await import('ffmpeg-static');
    const bin = mod.default || mod;
    if (bin && typeof bin === 'string' && existsSync(bin)) {
      _ffmpegPath = bin;
      return bin;
    }
  } catch { /* ignore */ }
  _ffmpegPath = 'ffmpeg';
  return 'ffmpeg';
}

// ─── Run FFmpeg command ────────────────────────────────────────
function runFFmpeg(args, label) {
  return new Promise((res, rej) => {
    const proc = spawn(args[0], args.slice(1), { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) res();
      else rej(new Error(`FFmpeg ${label} failed (code ${code}):\n${stderr.slice(-1500)}`));
    });
    proc.on('error', (err) => {
      rej(new Error(`FFmpeg not found. npm install ffmpeg-static\n${err.message}`));
    });
  });
}

// ─── Convert an image to a video clip ──────────────────────────
async function imageToClip(ffmpeg, imgPath, duration, fps, resolution, outPath) {
  await runFFmpeg([
    ffmpeg, '-y',
    '-loop', '1',
    '-i', imgPath,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
    outPath,
  ], 'img→clip');
}

// ─── Re-encode a recording to match specs ──────────────────────
async function normalizeClip(ffmpeg, input, fps, resolution, outPath) {
  await runFFmpeg([
    ffmpeg, '-y',
    '-i', input,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '22',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
    '-an',
    outPath,
  ], 'normalize');
}

// ─── Load cursor overlay module ────────────────────────────────
async function loadCursorOverlay() {
  try {
    const thisDir = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
    const modPath = pathToFileURL(resolve(thisDir, 'cursor-overlay.mjs')).href;
    const mod = await import(modPath);
    return mod.injectCursorOverlay;
  } catch {
    return null;
  }
}

// ─── Build slide data for a scene ──────────────────────────────
function buildSlideForScene(scene, config) {
  const cover = config.cover || {};
  if (scene.slideType === 'cover') {
    return {
      type: 'cover',
      title: cover.title || 'Tutorial',
      subtitle: cover.subtitle || '',
      version: cover.version || '',
      classification: cover.classification || '',
      footer: cover.footer || '',
      logo: cover.logo || null,
      duration: scene.duration || 6,
    };
  }
  if (scene.slideType === 'section-title') {
    return {
      type: 'section-title',
      title: scene.title || '',
      subtitle: scene.subtitle || '',
      sectionNumber: scene.sectionNumber || '',
      duration: scene.duration || 4,
    };
  }
  if (scene.slideType === 'closing') {
    return {
      type: 'closing',
      title: 'Fin del Tutorial',
      subtitle: cover.footer || 'NOR-PAN S.A.',
      duration: scene.duration || 6,
    };
  }
  return {
    type: 'content',
    title: scene.title || '',
    text: scene.text || '',
    bullets: scene.bullets || [],
    duration: scene.duration || 6,
  };
}

// ─── Main export ───────────────────────────────────────────────
export async function exportTutorialToVideo(config) {
  const videoCfg = config.video || {};
  const output = videoCfg.output || config.output.replace(/\.pdf$/i, '.mp4');
  const resolution = videoCfg.resolution || { width: 1920, height: 1080 };
  const fps = videoCfg.fps || 30;
  const mode = videoCfg.mode || 'slides-only';

  console.log('\n========================================');
  console.log('  Exportando Tutorial a Video');
  console.log('========================================');
  console.log(`  Resolución: ${resolution.width}×${resolution.height}`);
  console.log(`  FPS: ${fps}`);
  console.log(`  Modo: ${mode}`);

  // ── Determine scenes ─────────────────────────────────────────
  let scenes = null;

  if (mode === 'hybrid' && videoCfg.scenes) {
    const scenesPath = resolve(dirname(config._configPath || '.'), videoCfg.scenes);
    console.log(`  Escenas: ${scenesPath}`);
    try {
      const mod = await import(pathToFileURL(scenesPath).href);
      scenes = mod.scenes || mod.default;
    } catch (err) {
      console.error(`  ❌ Error cargando escenas: ${err.message}`);
      return null;
    }
    console.log(`  Total escenas: ${scenes.length}`);
    const slideCount = scenes.filter(s => s.type === 'slide').length;
    const recCount = scenes.filter(s => s.type === 'recording').length;
    console.log(`    → ${slideCount} slides + ${recCount} grabaciones`);
  }

  if (mode === 'slides-only' && !existsSync(config.input)) {
    console.error('  ❌ Markdown no encontrado: ' + config.input);
    return null;
  }

  // Temp directory
  const tmpDir = join(dirname(output), '.tutorial-video-tmp');
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  // Load theme CSS
  const css = await loadVideoThemeCSS(videoCfg.theme || config.theme);
  // Load cursor overlay
  const injectCursor = await loadCursorOverlay();

  const ffmpeg = await getFFmpegPath();
  const clipPaths = [];
  const startTime = Date.now();

  if (mode === 'hybrid' && scenes) {
    // ── HYBRID MODE ────────────────────────────────────────────
    console.log('  Lanzando Playwright...');
    const browser = await chromium.launch({ headless: true });

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const clipIdx = String(i).padStart(3, '0');
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      if (scene.type === 'slide') {
        // ── Slide scene ────────────────────────────────────────
        const label = scene.slideType === 'cover' ? 'Portada'
          : scene.slideType === 'closing' ? 'Cierre'
          : scene.title || scene.slideType;
        process.stdout.write(`\r  📸 [${i + 1}/${scenes.length}] Slide: ${label}  (${elapsed}s)                `);

        const slideData = buildSlideForScene(scene, config);
        const html = renderSlideHTML(slideData, 1.0, css, resolution);

        const ctx = await browser.newContext({
          viewport: { width: resolution.width, height: resolution.height },
          deviceScaleFactor: 1,
        });
        const page = await ctx.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        if (i === 0) await page.waitForTimeout(500);

        const imgPath = join(tmpDir, `scene-${clipIdx}.png`);
        await page.screenshot({ path: imgPath, type: 'png' });
        await ctx.close();

        const clipPath = join(tmpDir, `clip-${clipIdx}.mp4`);
        await imageToClip(ffmpeg, imgPath, scene.duration || 4, fps, resolution, clipPath);
        clipPaths.push(clipPath);

      } else if (scene.type === 'recording' && scene.actions) {
        // ── Recording scene ────────────────────────────────────
        const label = scene.name || scene.description || `rec-${i}`;
        process.stdout.write(`\r  🎬 [${i + 1}/${scenes.length}] Grabando: ${label}  (${elapsed}s)                `);

        const recDir = join(tmpDir, `rec-${clipIdx}`);
        mkdirSync(recDir, { recursive: true });

        const ctx = await browser.newContext({
          viewport: { width: resolution.width, height: resolution.height },
          recordVideo: {
            dir: recDir,
            size: { width: resolution.width, height: resolution.height },
          },
        });
        const page = await ctx.newPage();

        // Navigate to app
        const appUrl = videoCfg.appUrl || 'http://localhost:5173';
        await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
        await page.waitForTimeout(1000);

        // Inject cursor overlay
        if (injectCursor) {
          await injectCursor(page);
          page.on('load', async () => {
            try { await injectCursor(page); } catch { /* page closed */ }
          });
        }

        // Execute scene actions
        try {
          await scene.actions(page);
        } catch (err) {
          console.warn(`\n  ⚠️  Error en "${label}": ${err.message}`);
        }

        // Finalize recording
        const video = page.video();
        await ctx.close();

        // Find recorded file
        let recordedPath = null;
        if (video) {
          try {
            recordedPath = await video.path();
          } catch { /* ignore */ }
        }
        if (!recordedPath || !existsSync(recordedPath)) {
          // Fallback: look in recDir
          const files = readdirSync(recDir).filter(f => f.endsWith('.webm'));
          if (files.length > 0) recordedPath = join(recDir, files[0]);
        }

        if (recordedPath && existsSync(recordedPath)) {
          const clipPath = join(tmpDir, `clip-${clipIdx}.mp4`);
          await normalizeClip(ffmpeg, recordedPath, fps, resolution, clipPath);
          clipPaths.push(clipPath);
        } else {
          console.warn(`\n  ⚠️  No video para "${label}"`);
        }
      }
    }

    const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(`\r  ✅ ${clipPaths.length} clips generados (${buildTime}s)                                    \n`);
    await browser.close();

  } else {
    // ── SLIDES-ONLY MODE ───────────────────────────────────────
    console.log('  Estrategia: screenshot + FFmpeg (slides-only)');
    console.log('  Parseando Markdown...');
    const slides = buildSlides(config);
    console.log(`  Slides: ${slides.length}`);

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: resolution.width, height: resolution.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const clipIdx = String(i).padStart(3, '0');
      const imgPath = join(tmpDir, `slide-${clipIdx}.png`);

      const html = renderSlideHTML(slide, 1.0, css, resolution);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      if (i === 0) await page.waitForTimeout(300);
      await page.screenshot({ path: imgPath, type: 'png' });

      const clipPath = join(tmpDir, `clip-${clipIdx}.mp4`);
      await imageToClip(ffmpeg, imgPath, slide.duration, fps, resolution, clipPath);
      clipPaths.push(clipPath);

      process.stdout.write(`\r  📸 Slides: ${Math.round(((i + 1) / slides.length) * 100)}% (${i + 1}/${slides.length})   `);
    }
    process.stdout.write(`\r  📸 ${clipPaths.length} clips (${((Date.now() - startTime) / 1000).toFixed(1)}s)                 \n`);
    await ctx.close();
    await browser.close();
  }

  // ── Concatenate all clips ────────────────────────────────────
  if (clipPaths.length === 0) {
    console.error('  ❌ No clips generated');
    rmSync(tmpDir, { recursive: true });
    return null;
  }

  console.log(`  Concatenando ${clipPaths.length} clips...`);

  const concatFile = join(tmpDir, 'concat.txt');
  writeFileSync(concatFile,
    clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'),
    'utf8'
  );

  const concatOut = join(tmpDir, 'final.mp4');
  await runFFmpeg([
    ffmpeg, '-y',
    '-f', 'concat', '-safe', '0',
    '-i', concatFile,
    '-c', 'copy',
    '-movflags', '+faststart',
    concatOut,
  ], 'concat');

  copyFileSync(concatOut, output);

  // ── Cleanup ──────────────────────────────────────────────────
  console.log('  Limpiando archivos temporales...');
  rmSync(tmpDir, { recursive: true });

  // ── Report ───────────────────────────────────────────────────
  if (existsSync(output)) {
    const stats = statSync(output);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ✅ Video generado: ${sizeMB} MB`);
    console.log(`  🎥 ${output}`);
    console.log(`  🚀 Tiempo total: ${totalTime}s`);
  }

  console.log('========================================\n');
  return output;
}
