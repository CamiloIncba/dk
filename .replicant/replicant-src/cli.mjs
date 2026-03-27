#!/usr/bin/env node
/**
 * ============================================================
 *  CLI — Replicant-2049
 *  Generate professional documentation, HTML, and videos
 * ============================================================
 *
 *  Usage:
 *    npx replicant <command> [options]
 *
 *  Commands:
 *    init              Initialize a new project with documentation structure
 *    sync              Check and track documentation progress
 *    generate          Generate final documents using Claude API
 *    export            Generate HTML/Video from Markdown
 *    (no command)      Legacy mode: export with --html/--video flags
 * ============================================================
 */

import { resolve, dirname } from 'path';
import { existsSync, readFileSync } from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { exportTutorialToVideo } from './export-video.mjs';
import { exportTutorialToHTML } from './export-html.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── ANSI Colors ───────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

// ─── Command detection ─────────────────────────────────────────
function getCommand() {
  const args = process.argv.slice(2);
  const firstArg = args[0];
  
  // Check if first arg is a command
  if (firstArg === 'init' || firstArg === 'sync' || firstArg === 'generate' || firstArg === 'export' || firstArg === 'audit') {
    return firstArg;
  }
  
  // Legacy mode: no command, use flags
  return 'export';
}

// ─── Run subcommand script ─────────────────────────────────────
function runSubcommand(scriptName) {
  const scriptPath = resolve(__dirname, scriptName);
  const args = process.argv.slice(3); // Remove node, cli.mjs, command
  
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

// ─── Parse export args ─────────────────────────────────────────
function parseExportArgs() {
  const args = process.argv.slice(2);
  let configPath = null;
  let doVideo = false;
  let doHtml = false;
  let skipCapture = false;
  let outputDir = null;
  
  // Skip 'export' command if present
  const startIndex = args[0] === 'export' ? 1 : 0;

  for (let i = startIndex; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) {
      configPath = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      outputDir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--video') {
      doVideo = true;
    } else if (args[i] === '--html') {
      doHtml = true;
    } else if (args[i] === '--skip-capture') {
      skipCapture = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    } else if (args[i] === '--version' || args[i] === '-v') {
      const pkg = JSON.parse(
        readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')
      );
      console.log(pkg.version);
      process.exit(0);
    }
  }

  // Default: look for tutorial.config.js in cwd
  if (!configPath) {
    configPath = resolve(process.cwd(), 'tutorial.config.js');
  }

  return { configPath, doVideo, doHtml, skipCapture, outputDir };
}

function printHelp() {
  console.log(`
  ${colors.bright}${colors.cyan}Replicant-2049${colors.reset}
  ────────────────────────────────────

  Generate professional documentation, HTML, and videos.

  ${colors.bright}Usage:${colors.reset}
    npx replicant <command> [options]

  ${colors.bright}Commands:${colors.reset}
    ${colors.green}init${colors.reset}              Initialize a new project with documentation
    ${colors.green}sync${colors.reset}              Check and track documentation progress
    ${colors.green}generate${colors.reset}          Generate final documents using Claude API
    ${colors.green}export${colors.reset}            Generate HTML/Video from Markdown
    ${colors.green}audit${colors.reset}             Audit project against mandatory standards

  ${colors.bright}Export Options:${colors.reset}
    --config <path>   Path to config file (default: ./tutorial.config.js)
    --html            Generate HTML fragment for in-app embedding
    --video           Generate MP4 video
    --output-dir <p>  Output directory (for --html export)
    --skip-capture    Skip screenshot capture (use existing images)

  ${colors.bright}Global Options:${colors.reset}
    --help, -h        Show this help
    --version, -v     Show version

  ${colors.bright}Examples:${colors.reset}
    npx replicant init --project TC --client NOR-PAN
    npx replicant sync --check
    npx replicant generate --project TC
    npx replicant generate --all --dir "C:\\Proyectos\\NOR-PAN"
    npx replicant export --config ./tutorial.config.js --html
    npx replicant export --config ./tutorial.config.js --html --output-dir ./public/tutorial
    npx replicant export --config ./tutorial.config.js --video --skip-capture
    npx replicant audit --dir "C:\\Proyectos\\NOR-PAN"
    npx replicant audit --dir . --verbose
    npx replicant audit --dir . --json
  `);
}

// ─── Run capture script ────────────────────────────────────────
async function runCaptureScript(captureConfig, configDir) {
  const scriptPath = resolve(configDir, captureConfig.script);

  if (!existsSync(scriptPath)) {
    console.error(`\n  ❌ Capture script not found: ${scriptPath}`);
    process.exit(1);
  }

  // Check if app is reachable
  if (captureConfig.appUrl) {
    console.log(`  🔍 Verificando que la app esté corriendo en ${captureConfig.appUrl}...`);
    try {
      const resp = await fetch(captureConfig.appUrl, { signal: AbortSignal.timeout(5000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      console.log(`  ✅ App detectada\n`);
    } catch {
      console.error(`\n  ❌ La app no está corriendo en ${captureConfig.appUrl}`);
      console.error(`  Iniciá la app antes de exportar, o usá --skip-capture para usar screenshots existentes.\n`);
      process.exit(1);
    }
  }

  console.log(`  📸 Ejecutando captura de screenshots...`);
  console.log(`  Script: ${scriptPath}\n`);

  return new Promise((resolveP, reject) => {
    const child = spawn('node', [scriptPath, '--skip-pdf'], {
      stdio: 'inherit',
      cwd: dirname(scriptPath),
    });
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n  ✅ Screenshots capturados exitosamente\n`);
        resolveP();
      } else {
        reject(new Error(`Capture script exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function handleExport() {
  const { configPath, doVideo, doHtml, skipCapture, outputDir } = parseExportArgs();

  if (!existsSync(configPath)) {
    console.error(`\n  ❌ Config file not found: ${configPath}`);
    console.error(`  Create a tutorial.config.js or use --config <path>\n`);
    process.exit(1);
  }

  console.log(`\n  📄 Config: ${configPath}`);

  // Load config
  const configUrl = pathToFileURL(configPath).href;
  const configModule = await import(configUrl);
  const config = configModule.default || configModule;

  const explicitFlags = doVideo || doHtml;

  // Default to HTML if no flags specified
  const shouldHtml = doHtml || !explicitFlags;

  // Resolve paths relative to config file location
  const configDir = dirname(configPath);
  const resolvedConfig = {
    ...config,
    _configPath: configPath,
    input: resolve(configDir, config.input),
    output: resolve(configDir, config.output),
    imagesDir: resolve(configDir, config.imagesDir || './SS'),
    htmlOutputDir: config.htmlOutputDir ? resolve(configDir, config.htmlOutputDir) : null,
    cover: {
      ...config.cover,
      logo: config.cover?.logo ? resolve(configDir, config.cover.logo) : null,
      backgroundImage: config.cover?.backgroundImage
        ? resolve(configDir, config.cover.backgroundImage)
        : null,
    },
  };

  // Resolve video paths
  if (config.video) {
    resolvedConfig.video = {
      ...config.video,
      output: config.video.output
        ? resolve(configDir, config.video.output)
        : resolvedConfig.output.replace(/\.(pdf|md)$/i, '.mp4'),
    };
    if (config.video.backgroundMusic) {
      resolvedConfig.video.backgroundMusic = resolve(configDir, config.video.backgroundMusic);
    }
  }

  // ─── Capture screenshots before export ────────────────────────
  const needsCapture = shouldHtml || doVideo;
  if (!skipCapture && config.capture?.script && needsCapture) {
    await runCaptureScript(config.capture, configDir);
  } else if (skipCapture) {
    console.log(`  ⏭️  Captura omitida (--skip-capture)\n`);
  } else if (!config.capture?.script && needsCapture) {
    console.log(`  ℹ️  Sin script de captura configurado, usando imágenes existentes\n`);
  }

  // Execute requested exports
  if (shouldHtml) {
    await exportTutorialToHTML(resolvedConfig, { outputDir });
  }

  if (doVideo) {
    await exportTutorialToVideo(resolvedConfig);
  }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const command = getCommand();

  switch (command) {
    case 'init':
      await runSubcommand('init-project.mjs');
      break;
    
    case 'sync':
      await runSubcommand('sync-docs.mjs');
      break;
    
    case 'generate':
      await runSubcommand('generate-docs.mjs');
      break;
    
    case 'audit':
      await runSubcommand('audit.mjs');
      break;
    
    case 'export':
    default:
      await handleExport();
      break;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n  ❌ Error:', err.message);
    process.exit(1);
  });
