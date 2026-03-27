#!/usr/bin/env node
/**
 * ============================================================
 *  audit.mjs — Project Standards Auditor
 *  Replicant-2049
 * ============================================================
 *
 *  Scans a project against the mandatory standards defined in
 *  Skills/STANDARDS.md and reports compliance.
 *
 *  Usage:
 *    npx replicant audit                        (auto-detect)
 *    npx replicant audit --dir C:\Proyectos\X   (explicit dir)
 *    npx replicant audit --json                 (JSON output)
 *    npx replicant audit --verbose              (show details)
 *
 * ============================================================
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── ANSI Colors ───────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

const PASS = `${c.green}✅ PASS${c.reset}`;
const FAIL = `${c.red}❌ FAIL${c.reset}`;
const WARN = `${c.yellow}⚠️  WARN${c.reset}`;

// ─── CLI Args ──────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let dir = process.cwd();
  let jsonOutput = false;
  let verbose = false;

  // Skip 'audit' command if present
  const start = args[0] === 'audit' ? 1 : 0;

  for (let i = start; i < args.length; i++) {
    if ((args[i] === '--dir' || args[i] === '-d') && args[i + 1]) {
      dir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--json') {
      jsonOutput = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    }
  }

  return { dir, jsonOutput, verbose };
}

// ─── Helpers ───────────────────────────────────────────────────
function fileExists(...paths) {
  return paths.some((p) => existsSync(p));
}

function readIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf8');
}

function countFiles(dir, extensions = []) {
  if (!existsSync(dir)) return 0;
  try {
    const files = readdirSync(dir);
    if (extensions.length === 0) return files.length;
    return files.filter((f) => extensions.some((ext) => f.endsWith(ext))).length;
  } catch {
    return 0;
  }
}

function grepDir(dir, pattern, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  if (!existsSync(dir)) return [];
  const regex = new RegExp(pattern, 'i');
  const results = [];

  function walk(d) {
    try {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(d, entry.name);
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.next'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          try {
            const content = readFileSync(fullPath, 'utf8');
            if (regex.test(content)) {
              results.push(fullPath);
            }
          } catch { /* skip unreadable files */ }
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }

  walk(dir);
  return results;
}

function grepFile(filePath, pattern) {
  const content = readIfExists(filePath);
  if (!content) return false;
  return new RegExp(pattern, 'i').test(content);
}

function fileHasContent(filePath, minChars = 500) {
  const content = readIfExists(filePath);
  if (!content) return false;
  return content.length >= minChars && !/\{\{PROYECTO\}\}/.test(content);
}

// ─── Detect Project Structure ──────────────────────────────────
function detectProject(baseDir) {
  // Try to detect {PROJECT}-backend, {PROJECT}-frontend, {PROJECT}-more
  const entries = readdirSync(baseDir);
  const backends = entries.filter((e) => e.endsWith('-backend') && statSync(join(baseDir, e)).isDirectory());
  const frontends = entries.filter((e) => e.endsWith('-frontend') && statSync(join(baseDir, e)).isDirectory());
  const mores = entries.filter((e) => e.endsWith('-more') && statSync(join(baseDir, e)).isDirectory());

  if (backends.length === 0 && frontends.length === 0) {
    // Maybe we are inside a project directory — check parent
    const parent = dirname(baseDir);
    const dirName = basename(baseDir);
    if (dirName.endsWith('-backend') || dirName.endsWith('-frontend')) {
      return detectProject(parent);
    }
    return null;
  }

  // Find the project code
  const allDirs = [...backends, ...frontends, ...mores];
  const codes = allDirs.map((d) => d.replace(/-(backend|frontend|more)$/, ''));
  const projectCode = codes.sort((a, b) =>
    codes.filter((x) => x === b).length - codes.filter((x) => x === a).length
  )[0];

  return {
    baseDir,
    projectCode,
    backend: join(baseDir, `${projectCode}-backend`),
    frontend: join(baseDir, `${projectCode}-frontend`),
    more: join(baseDir, `${projectCode}-more`),
    hasBackend: existsSync(join(baseDir, `${projectCode}-backend`)),
    hasFrontend: existsSync(join(baseDir, `${projectCode}-frontend`)),
    hasMore: existsSync(join(baseDir, `${projectCode}-more`)),
  };
}

// ─── Standard Checks ──────────────────────────────────────────
function buildChecks(project) {
  const { backend, frontend, more, hasBackend, hasFrontend, hasMore } = project;

  return [
    // ─── DOC ───────────────────────────────────────────────
    {
      id: 'DOC-01',
      name: 'CLAUDE.md (Context Hub)',
      category: 'DOC',
      check() {
        const path = join(more, 'CLAUDE.md');
        if (!existsSync(path)) return { status: 'fail', detail: 'No existe CLAUDE.md en -more/' };
        const content = readIfExists(path) || '';
        if (content.length < 500) return { status: 'fail', detail: `CLAUDE.md tiene solo ${content.length} chars (mín 500)` };
        if (/\{\{PROYECTO\}\}/.test(content)) return { status: 'fail', detail: 'Contiene placeholders {{PROYECTO}}' };
        const sections = ['arquitectura', 'tech stack', 'endpoint'].filter(
          (s) => content.toLowerCase().includes(s)
        );
        if (sections.length < 2) return { status: 'warn', detail: `Faltan secciones clave (encontradas: ${sections.join(', ')})` };
        return { status: 'pass', detail: `${content.length} chars, secciones OK` };
      },
    },
    {
      id: 'DOC-02',
      name: 'SRS (Requisitos)',
      category: 'DOC',
      check() {
        const candidates = [
          join(more, 'SRS.md'),
          ...readdirSync(more).filter((f) => /^SRS/i.test(f) && f.endsWith('.md')).map((f) => join(more, f)),
        ];
        const found = candidates.find((p) => existsSync(p));
        if (!found) return { status: 'fail', detail: 'No existe SRS*.md en -more/' };
        const content = readIfExists(found) || '';
        if (content.length < 1000) return { status: 'fail', detail: `SRS tiene solo ${content.length} chars (mín 1000)` };
        const hasRF = /\bRF[-\s]?\d/i.test(content);
        const hasRNF = /\bRNF[-\s]?\d/i.test(content);
        if (!hasRF || !hasRNF) return { status: 'warn', detail: `RF: ${hasRF ? 'sí' : 'no'}, RNF: ${hasRNF ? 'sí' : 'no'}` };
        return { status: 'pass', detail: `${basename(found)}, ${content.length} chars, RF+RNF OK` };
      },
    },
    {
      id: 'DOC-03',
      name: 'README Técnico',
      category: 'DOC',
      check() {
        const checks = [];
        if (hasBackend) {
          const readme = readIfExists(join(backend, 'README.md'));
          checks.push({ where: 'backend', exists: !!readme, len: readme?.length || 0 });
        }
        if (hasFrontend) {
          const readme = readIfExists(join(frontend, 'README.md'));
          checks.push({ where: 'frontend', exists: !!readme, len: readme?.length || 0 });
        }
        const existing = checks.filter((c) => c.exists && c.len > 300);
        if (existing.length === 0) return { status: 'fail', detail: 'No existe README.md con contenido (>300 chars)' };
        if (existing.length < checks.length) return { status: 'warn', detail: `README solo en ${existing.map((c) => c.where).join(', ')}` };
        return { status: 'pass', detail: checks.map((c) => `${c.where}: ${c.len} chars`).join(', ') };
      },
    },
    {
      id: 'DOC-04',
      name: 'Plan de Trabajo',
      category: 'DOC',
      check() {
        const candidates = readdirSync(more).filter((f) => /^PLAN/i.test(f) && f.endsWith('.md')).map((f) => join(more, f));
        const found = candidates.find((p) => fileHasContent(p, 500));
        if (!found) return { status: 'fail', detail: 'No existe PLAN*.md con contenido en -more/' };
        return { status: 'pass', detail: `${basename(found)}` };
      },
    },
    {
      id: 'DOC-05',
      name: 'Tutorial con Capturas',
      category: 'DOC',
      check() {
        const tutorials = readdirSync(more).filter((f) => /^TUTORIAL/i.test(f) && f.endsWith('.md'));
        if (tutorials.length === 0) return { status: 'fail', detail: 'No existe TUTORIAL*.md en -more/' };
        const tutContent = readIfExists(join(more, tutorials[0])) || '';
        if (tutContent.length < 500) return { status: 'fail', detail: 'Tutorial tiene poco contenido' };

        const ssDir = join(more, 'SS');
        const imgCount = countFiles(ssDir, ['.png', '.jpg', '.jpeg', '.webp']);
        if (imgCount < 10) return { status: 'fail', detail: `Solo ${imgCount} imágenes en SS/ (mín 10)` };

        const hasCapture = existsSync(join(more, 'SCRIPT', 'capture-tutorial.mjs'));
        const hasImgRefs = /!\[.*?\]\(SS\//.test(tutContent);
        const issues = [];
        if (!hasCapture) issues.push('sin capture-tutorial.mjs');
        if (!hasImgRefs) issues.push('sin referencias a SS/ en markdown');
        if (issues.length > 0) return { status: 'warn', detail: `${imgCount} imgs, pero: ${issues.join(', ')}` };

        return { status: 'pass', detail: `${tutorials[0]}, ${imgCount} imágenes, capture script OK` };
      },
    },
    {
      id: 'DOC-06',
      name: 'Tutorial In-App',
      category: 'DOC',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };

        const tutPage = grepDir(join(frontend, 'src'), 'tutorial', ['.tsx', '.ts'])
          .filter((f) => /pages.*tutorial/i.test(f));
        if (tutPage.length === 0) return { status: 'fail', detail: 'No existe página Tutorial.tsx en src/pages/' };

        const routerFiles = grepDir(join(frontend, 'src'), '/tutorial', ['.tsx', '.ts']);
        const hasRoute = routerFiles.some((f) => {
          const content = readIfExists(f) || '';
          return /path=["']\/tutorial["']/.test(content) || /path:\s*["']\/tutorial["']/.test(content);
        });
        if (!hasRoute) return { status: 'fail', detail: 'Ruta /tutorial no registrada en el router' };

        const tutDir = join(frontend, 'public', 'tutorial');
        const hasContent = existsSync(join(tutDir, 'tutorial-content.html'));
        const hasToc = existsSync(join(tutDir, 'tutorial-toc.json'));
        if (!hasContent || !hasToc) return { status: 'warn', detail: 'Ruta existe pero public/tutorial/ no tiene archivos generados' };

        return { status: 'pass', detail: 'Página + ruta + archivos HTML/TOC OK' };
      },
    },

    // ─── UX ────────────────────────────────────────────────
    {
      id: 'UX-01',
      name: 'Modales de Confirmación',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const pattern = 'ConfirmDialog|ConfirmDeleteDialog|AlertDialog|confirm-dialog|alert-dialog';
        const files = grepDir(join(frontend, 'src'), pattern);
        if (files.length === 0) return { status: 'fail', detail: 'No hay componentes de confirmación' };
        // Check usage (not just definition)
        const componentFiles = files.filter((f) => /components/i.test(f));
        const usageFiles = files.filter((f) => !/components.*ui/i.test(f));
        if (usageFiles.length < 2) return { status: 'warn', detail: `Definido pero usado en solo ${usageFiles.length} lugar(es)` };
        return { status: 'pass', detail: `${componentFiles.length} componentes, ${usageFiles.length} usos` };
      },
    },
    {
      id: 'UX-02',
      name: 'Error Boundary',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const ebFile = grepDir(join(frontend, 'src', 'components'), 'ErrorBoundary|error.boundary');
        if (ebFile.length === 0) return { status: 'fail', detail: 'No existe ErrorBoundary' };
        const appFile = readIfExists(join(frontend, 'src', 'App.tsx')) || '';
        if (!/ErrorBoundary/i.test(appFile)) return { status: 'warn', detail: 'ErrorBoundary existe pero no se usa en App.tsx' };
        return { status: 'pass', detail: 'ErrorBoundary en App.tsx' };
      },
    },
    {
      id: 'UX-03',
      name: 'Tema Claro / Oscuro',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const hasProvider = grepDir(join(frontend, 'src'), 'ThemeProvider|next-themes').length > 0;
        const hasToggle = grepDir(join(frontend, 'src', 'components'), 'theme-toggle|ThemeToggle|ModeToggle').length > 0;
        const darkUsage = grepDir(join(frontend, 'src'), 'dark:').length;
        if (!hasProvider) return { status: 'fail', detail: 'No existe ThemeProvider' };
        if (!hasToggle) return { status: 'warn', detail: 'ThemeProvider existe pero sin toggle' };
        if (darkUsage < 5) return { status: 'warn', detail: `Solo ${darkUsage} archivos usan dark:` };
        return { status: 'pass', detail: `ThemeProvider + toggle + ${darkUsage} archivos con dark:` };
      },
    },
    {
      id: 'UX-04',
      name: 'Loading States',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const pattern = 'LoadingState|Skeleton|Loader2|spinner|isLoading';
        const files = grepDir(join(frontend, 'src'), pattern);
        if (files.length === 0) return { status: 'fail', detail: 'No hay indicadores de carga' };
        if (files.length < 3) return { status: 'warn', detail: `Solo ${files.length} archivo(s) con loading` };
        return { status: 'pass', detail: `${files.length} archivos con loading states` };
      },
    },
    {
      id: 'UX-05',
      name: 'Empty States',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const pattern = 'EmptyState|empty.state|No hay .* para mostrar|no.*results';
        const files = grepDir(join(frontend, 'src'), pattern);
        if (files.length === 0) return { status: 'fail', detail: 'No hay componentes de empty state' };
        return { status: 'pass', detail: `${files.length} archivos con empty states` };
      },
    },
    {
      id: 'UX-06',
      name: 'Toast Notifications',
      category: 'UX',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const appContent = readIfExists(join(frontend, 'src', 'App.tsx')) || '';
        const hasToaster = /Toaster|Sonner/i.test(appContent);
        if (!hasToaster) return { status: 'fail', detail: 'No hay Toaster/Sonner en App.tsx' };
        const usages = grepDir(join(frontend, 'src'), 'useToast|toast\\(|sonner');
        if (usages.length < 3) return { status: 'warn', detail: `Toast configurado pero usado en solo ${usages.length} lugar(es)` };
        return { status: 'pass', detail: `Toaster en App.tsx, ${usages.length} usos` };
      },
    },

    // ─── FEAT ──────────────────────────────────────────────
    {
      id: 'FEAT-01',
      name: 'Centro de Notificaciones',
      category: 'FEAT',
      check() {
        const issues = [];
        // Frontend
        if (hasFrontend) {
          const feFiles = grepDir(join(frontend, 'src'), 'NotificationsDropdown|NotificationCenter|NotificationPanel');
          if (feFiles.length === 0) issues.push('sin componente frontend');
        }
        // Backend
        if (hasBackend) {
          const beFiles = grepDir(join(backend, 'src'), 'notification|NotificationsController');
          if (beFiles.length === 0) issues.push('sin módulo backend');
        }
        if (issues.length > 0) return { status: 'fail', detail: issues.join(', ') };
        return { status: 'pass', detail: 'Frontend + Backend OK' };
      },
    },
    {
      id: 'FEAT-02',
      name: 'Centro de Actividad',
      category: 'FEAT',
      check() {
        const issues = [];
        if (hasFrontend) {
          const feFiles = grepDir(join(frontend, 'src'), 'ActivityPanel|ActivityLog|ActivityCenter');
          if (feFiles.length === 0) issues.push('sin componente frontend');
        }
        if (hasBackend) {
          const beFiles = grepDir(join(backend, 'src'), 'activity|ActivityController');
          if (beFiles.length === 0) issues.push('sin módulo backend');
        }
        if (issues.length > 0) return { status: 'fail', detail: issues.join(', ') };
        return { status: 'pass', detail: 'Frontend + Backend OK' };
      },
    },
    {
      id: 'FEAT-03',
      name: 'Push Notifications',
      category: 'FEAT',
      check() {
        const issues = [];
        if (hasFrontend) {
          const feFiles = grepDir(join(frontend, 'src'), 'push.notification|PushNotification|use-push');
          if (feFiles.length === 0) issues.push('sin hook/componente push frontend');
        }
        if (hasBackend) {
          const beFiles = grepDir(join(backend, 'src'), 'push|web-push|webpush|PushController');
          if (beFiles.length === 0) issues.push('sin endpoint push backend');
        }
        if (issues.length === 2) return { status: 'fail', detail: issues.join(', ') };
        if (issues.length === 1) return { status: 'warn', detail: issues[0] };
        return { status: 'pass', detail: 'Frontend + Backend OK' };
      },
    },
    {
      id: 'FEAT-04',
      name: 'PWA Ready',
      category: 'FEAT',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const issues = [];
        const pkgContent = readIfExists(join(frontend, 'package.json')) || '';
        const hasPwaPlugin = /vite-plugin-pwa|@vite-pwa|workbox/i.test(pkgContent);
        if (!hasPwaPlugin) issues.push('sin plugin PWA');

        const hasSW = fileExists(
          join(frontend, 'src', 'sw.ts'),
          join(frontend, 'src', 'sw.js'),
          join(frontend, 'public', 'sw.js'),
          join(frontend, 'dev-dist', 'sw.js'),
        );
        if (!hasSW) issues.push('sin service worker');

        const hasManifest = fileExists(
          join(frontend, 'public', 'manifest.json'),
          join(frontend, 'public', 'manifest.webmanifest'),
        ) || /manifest/i.test(pkgContent);

        if (issues.length > 1) return { status: 'fail', detail: issues.join(', ') };
        if (issues.length === 1) return { status: 'warn', detail: issues[0] };
        return { status: 'pass', detail: 'Plugin PWA + SW OK' };
      },
    },
    {
      id: 'FEAT-05',
      name: 'Exportar Reportes',
      category: 'FEAT',
      check() {
        if (!hasFrontend) return { status: 'warn', detail: 'Sin frontend detectado' };
        const pattern = 'use-export|export-utils|ExportButton|xlsx|csv|jspdf|export.*payment|export.*report';
        const files = grepDir(join(frontend, 'src'), pattern);
        if (files.length === 0) return { status: 'fail', detail: 'No hay funcionalidad de exportación' };
        const formats = [];
        const allContent = files.map((f) => readIfExists(f) || '').join('\n');
        if (/xlsx|excel/i.test(allContent)) formats.push('Excel');
        if (/csv/i.test(allContent)) formats.push('CSV');
        if (/pdf|jspdf/i.test(allContent)) formats.push('PDF');
        if (formats.length < 2) return { status: 'warn', detail: `Solo formato(s): ${formats.join(', ') || '?'}` };
        return { status: 'pass', detail: `Formatos: ${formats.join(', ')}` };
      },
    },

    // ─── QA ────────────────────────────────────────────────
    {
      id: 'QA-01',
      name: 'Pre-commit Hooks',
      category: 'QA',
      check() {
        const huskyBe = existsSync(join(backend, '.husky'));
        const huskyFe = existsSync(join(frontend, '.husky'));
        const pkgBe = readIfExists(join(backend, 'package.json')) || '';
        const pkgFe = readIfExists(join(frontend, 'package.json')) || '';
        const lintStagedBe = /lint-staged|husky/i.test(pkgBe);
        const lintStagedFe = /lint-staged|husky/i.test(pkgFe);

        const hasHooks = huskyBe || huskyFe || lintStagedBe || lintStagedFe;
        if (!hasHooks) return { status: 'fail', detail: 'No hay .husky/ ni lint-staged en ningún repo' };

        const details = [];
        if (huskyBe) details.push('backend .husky/');
        if (huskyFe) details.push('frontend .husky/');
        return { status: 'pass', detail: details.join(', ') };
      },
    },
    {
      id: 'QA-02',
      name: 'Tests E2E',
      category: 'QA',
      check() {
        const dirs = [
          join(backend, 'test'),
          join(backend, 'e2e'),
          join(frontend, 'test'),
          join(frontend, 'e2e'),
          join(frontend, 'src', 'test'),
        ];
        let totalTests = 0;
        const found = [];
        for (const dir of dirs) {
          const count = countFiles(dir, ['.spec.ts', '.spec.tsx', '.e2e-spec.ts', '.test.ts', '.test.tsx']);
          if (count > 0) {
            totalTests += count;
            found.push(`${basename(dirname(dir))}/${basename(dir)}: ${count}`);
          }
        }
        if (totalTests === 0) return { status: 'fail', detail: 'No hay archivos de test' };
        if (totalTests < 3) return { status: 'warn', detail: `Solo ${totalTests} test(s): ${found.join(', ')}` };
        return { status: 'pass', detail: `${totalTests} tests: ${found.join(', ')}` };
      },
    },
    {
      id: 'QA-03',
      name: 'Linting Configurado',
      category: 'QA',
      check() {
        const checks = [];
        for (const [label, dir] of [['backend', backend], ['frontend', frontend]]) {
          if (!existsSync(dir)) continue;
          const hasConfig = fileExists(
            join(dir, 'eslint.config.js'),
            join(dir, 'eslint.config.mjs'),
            join(dir, '.eslintrc.js'),
            join(dir, '.eslintrc.json'),
          );
          const pkg = readIfExists(join(dir, 'package.json')) || '';
          const hasScript = /"lint"/.test(pkg);
          if (hasConfig && hasScript) checks.push(`${label} ✓`);
          else if (hasConfig) checks.push(`${label} (config sin script)`);
          else checks.push(`${label} ✗`);
        }
        const passing = checks.filter((c) => c.includes('✓'));
        if (passing.length === 0) return { status: 'fail', detail: checks.join(', ') };
        if (passing.length < checks.length) return { status: 'warn', detail: checks.join(', ') };
        return { status: 'pass', detail: checks.join(', ') };
      },
    },
    {
      id: 'QA-04',
      name: 'TypeScript Estricto',
      category: 'QA',
      check() {
        const checks = [];
        for (const [label, dir] of [['backend', backend], ['frontend', frontend]]) {
          if (!existsSync(dir)) continue;
          const tsconfig = readIfExists(join(dir, 'tsconfig.json'));
          if (!tsconfig) {
            checks.push(`${label}: sin tsconfig.json`);
            continue;
          }
          const hasStrict = /"strict"\s*:\s*true/.test(tsconfig);
          const hasNullCheck = /"strictNullChecks"\s*:\s*true/.test(tsconfig);
          if (hasStrict) checks.push(`${label}: strict ✓`);
          else if (hasNullCheck) checks.push(`${label}: strictNullChecks ✓`);
          else checks.push(`${label}: strict ✗`);
        }
        const passing = checks.filter((c) => c.includes('✓'));
        if (passing.length === 0) return { status: 'fail', detail: checks.join(', ') };
        if (passing.length < checks.length) return { status: 'warn', detail: checks.join(', ') };
        return { status: 'pass', detail: checks.join(', ') };
      },
    },
    {
      id: 'QA-05',
      name: 'Test Coverage Mínimo',
      category: 'QA',
      check() {
        const checks = [];
        for (const [label, dir] of [['backend', backend], ['frontend', frontend]]) {
          if (!existsSync(dir)) continue;
          const pkg = readIfExists(join(dir, 'package.json')) || '';
          const hasTestScript = /"test"\s*:/.test(pkg);
          const testDirs = ['test', 'tests', '__tests__', 'e2e'].map(d => join(dir, d));
          const srcTestFiles = grepDir(dir, '\.spec\.|\.(test)\.(ts|js|tsx|jsx)', ['.ts', '.js', '.tsx', '.jsx']);
          const hasTestDir = testDirs.some(d => existsSync(d) && readdirSync(d).length > 0);
          const hasTestFiles = hasTestDir || srcTestFiles.length > 0;
          if (hasTestScript && hasTestFiles) checks.push(`${label}: tests ✓`);
          else if (hasTestScript) checks.push(`${label}: script sin archivos de test`);
          else if (hasTestFiles) checks.push(`${label}: tests sin script`);
          else checks.push(`${label}: sin tests ✗`);
        }
        const passing = checks.filter((c) => c.includes('✓'));
        if (passing.length === 0) return { status: 'fail', detail: checks.join(', ') };
        if (passing.length < checks.length) return { status: 'warn', detail: checks.join(', ') };
        return { status: 'pass', detail: checks.join(', ') };
      },
    },
    {
      id: 'QA-06',
      name: 'Workflow de Desarrollo Documentado',
      category: 'QA',
      check() {
        const claudeMd = readIfExists(join(more, 'CLAUDE.md')) || '';
        const hasTddRef = /TDD|test.driven|test-driven|test first|skills?\/process/i.test(claudeMd);
        const hasGitRef = /git.workflow|rama dev|branch dev|preguntar antes de commit/i.test(claudeMd);
        const details = [];
        if (hasTddRef) details.push('TDD referenciado ✓');
        else details.push('TDD no referenciado en CLAUDE.md ✗');
        if (hasGitRef) details.push('Git workflow referenciado ✓');
        else details.push('Git workflow no referenciado en CLAUDE.md ✗');
        const passing = details.filter((d) => d.includes('✓')).length;
        if (passing === 0) return { status: 'fail', detail: details.join(', ') };
        if (passing < 2) return { status: 'warn', detail: details.join(', ') };
        return { status: 'pass', detail: details.join(', ') };
      },
    },
  ];
}

// ─── Run Audit ─────────────────────────────────────────────────
function runAudit(project, verbose) {
  const checks = buildChecks(project);
  const results = [];

  for (const check of checks) {
    try {
      const result = check.check();
      results.push({
        id: check.id,
        name: check.name,
        category: check.category,
        ...result,
      });
    } catch (err) {
      results.push({
        id: check.id,
        name: check.name,
        category: check.category,
        status: 'fail',
        detail: `Error: ${err.message}`,
      });
    }
  }

  return results;
}

// ─── Print Report ──────────────────────────────────────────────
function printReport(project, results, verbose) {
  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const warn = results.filter((r) => r.status === 'warn').length;
  const total = results.length;
  const pct = Math.round((pass / total) * 100);

  console.log('');
  console.log(`${c.bold}╔══════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}║          📋  AUDITORÍA DE ESTÁNDARES DE PROYECTO            ║${c.reset}`);
  console.log(`${c.bold}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log('');
  console.log(`  ${c.dim}Proyecto:${c.reset}  ${c.bold}${project.projectCode}${c.reset}`);
  console.log(`  ${c.dim}Directorio:${c.reset} ${project.baseDir}`);
  console.log(`  ${c.dim}Backend:${c.reset}    ${project.hasBackend ? c.green + '✓' + c.reset : c.red + '✗' + c.reset}`);
  console.log(`  ${c.dim}Frontend:${c.reset}   ${project.hasFrontend ? c.green + '✓' + c.reset : c.red + '✗' + c.reset}`);
  console.log(`  ${c.dim}Docs (-more):${c.reset} ${project.hasMore ? c.green + '✓' + c.reset : c.red + '✗' + c.reset}`);
  console.log('');

  // Group by category
  const categories = ['DOC', 'UX', 'FEAT', 'QA'];
  const categoryNames = { DOC: 'Documentación', UX: 'Experiencia de Usuario', FEAT: 'Funcionalidades', QA: 'Calidad' };

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;

    const catPass = catResults.filter((r) => r.status === 'pass').length;
    console.log(`  ${c.bold}${c.blue}═══ ${categoryNames[cat]} (${catPass}/${catResults.length}) ═══${c.reset}`);

    for (const r of catResults) {
      const icon = r.status === 'pass' ? PASS : r.status === 'warn' ? WARN : FAIL;
      console.log(`    ${icon}  ${c.bold}${r.id}${c.reset} ${r.name}`);
      if (verbose || r.status !== 'pass') {
        console.log(`           ${c.dim}${r.detail}${c.reset}`);
      }
    }
    console.log('');
  }

  // Summary bar
  const barLen = 30;
  const passBar = Math.round((pass / total) * barLen);
  const warnBar = Math.round((warn / total) * barLen);
  const failBar = barLen - passBar - warnBar;
  const bar = `${c.bgGreen}${' '.repeat(passBar)}${c.reset}${c.bgYellow}${' '.repeat(warnBar)}${c.reset}${c.bgRed}${' '.repeat(failBar)}${c.reset}`;

  console.log(`  ${c.bold}═══ RESULTADO ═══${c.reset}`);
  console.log(`    ${bar}  ${c.bold}${pct}%${c.reset}`);
  console.log(`    ${c.green}✅ ${pass} pass${c.reset}  ${c.yellow}⚠️  ${warn} warn${c.reset}  ${c.red}❌ ${fail} fail${c.reset}  (${total} total)`);
  console.log('');

  if (fail === 0 && warn === 0) {
    console.log(`  ${c.green}${c.bold}🎉 ¡Proyecto cumple con todos los estándares!${c.reset}`);
  } else if (fail === 0) {
    console.log(`  ${c.yellow}${c.bold}⚡ Proyecto pasa todos los obligatorios, pero tiene ${warn} warning(s).${c.reset}`);
  } else {
    console.log(`  ${c.red}${c.bold}🔴 Proyecto tiene ${fail} estándar(es) que no cumple.${c.reset}`);
  }
  console.log('');

  return { pass, fail, warn, total, pct };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const { dir, jsonOutput, verbose } = parseArgs();

  const project = detectProject(dir);
  if (!project) {
    console.error(`\n  ❌ No se detectó estructura de proyecto en: ${dir}`);
    console.error(`  Esperado: {PROJECT}-backend/, {PROJECT}-frontend/, {PROJECT}-more/`);
    console.error(`  Usá --dir para apuntar al directorio padre.\n`);
    process.exit(1);
  }

  const results = runAudit(project, verbose);

  if (jsonOutput) {
    console.log(JSON.stringify({
      project: project.projectCode,
      baseDir: project.baseDir,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        pass: results.filter((r) => r.status === 'pass').length,
        fail: results.filter((r) => r.status === 'fail').length,
        warn: results.filter((r) => r.status === 'warn').length,
        total: results.length,
      },
    }, null, 2));
  } else {
    const { fail } = printReport(project, results, verbose);
    process.exit(fail > 0 ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`\n  ❌ Error: ${err.message}`);
  process.exit(1);
});
