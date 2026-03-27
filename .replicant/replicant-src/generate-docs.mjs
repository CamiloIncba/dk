#!/usr/bin/env node
/**
 * ============================================================
 *  generate-docs.mjs — Replicant-2049
 *  Generate final documents using GitHub Models API (Copilot)
 * ============================================================
 *
 *  Usage:
 *    npx replicant generate [options]
 *
 *  Options:
 *    --project NAME     Generate docs for specific project
 *    --all              Generate docs for ALL projects in directory
 *    --dir PATH         Base directory to scan (default: cwd)
 *    --docs DOC1,DOC2   Comma-separated docs to generate (default: all)
 *    --model MODEL      Model to use (default: claude-sonnet-4-20250514)
 *    --dry-run          Analyze only, don't call API
 *    --force            Overwrite existing non-template documents
 *    --help, -h         Show help
 *
 *  Environment:
 *    GITHUB_TOKEN       Required. Your GitHub Personal Access Token.
 * ============================================================
 */

import { resolve, dirname, join } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { pathToFileURL } from 'url';
import { analyzeProject, analysisToContext, estimateTokens } from './analyze-project.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILLS_DIR = resolve(__dirname, '..', 'Skills');

// ─── GitHub Models API ─────────────────────────────────────────
const GITHUB_MODELS_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const RATE_LIMIT_DELAY_MS = 5000; // 5s between calls to stay safe with rate limits
const MAX_INPUT_TOKENS = 7500; // GitHub Models free tier: 8K in, keep margin for system prompt

// ─── ANSI Colors ───────────────────────────────────────────────
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const log = {
  info: (msg) => console.log(`${c.blue}i${c.reset} ${msg}`),
  success: (msg) => console.log(`${c.green}✓${c.reset} ${msg}`),
  warn: (msg) => console.log(`${c.yellow}⚠${c.reset} ${msg}`),
  error: (msg) => console.log(`${c.red}✗${c.reset} ${msg}`),
  title: (msg) => console.log(`\n${c.bright}${c.cyan}${msg}${c.reset}\n`),
  step: (n, total, msg) => console.log(`  ${c.dim}[${n}/${total}]${c.reset} ${msg}`),
};

// ─── Available models (GitHub Models uses publisher/model format) ───
const MODELS = {
  'openai/gpt-4.1':             { label: 'GPT-4.1' },
  'openai/gpt-4.1-mini':        { label: 'GPT-4.1 Mini' },
  'openai/gpt-4.1-nano':        { label: 'GPT-4.1 Nano' },
  'openai/gpt-4o':              { label: 'GPT-4o' },
  'openai/gpt-4o-mini':         { label: 'GPT-4o Mini' },
};

const DEFAULT_MODEL = 'openai/gpt-4.1-mini';

// ─── Document definitions ──────────────────────────────────────
const DOC_DEFINITIONS = {
  SRS: {
    output: 'SRS.md',
    skill: 'SRS_TEMPLATE.md',
    label: 'Especificación de Requisitos',
    maxTokens: 4000,
  },
  PLAN: {
    output: 'PLAN.md',
    skill: 'PLAN_TEMPLATE.md',
    label: 'Plan de Trabajo',
    maxTokens: 4000,
  },
  CLAUDE: {
    output: 'CLAUDE.md',
    skill: 'CLAUDE_TEMPLATE.md',
    label: 'Context Hub',
    maxTokens: 4000,
  },
  LOVABLE: {
    output: 'LOVABLE-PROMPT.md',
    skill: 'LOVABLE_PROMPT_TEMPLATE.md',
    label: 'Lovable.dev Prompts',
    maxTokens: 4000,
  },
  README: {
    output: 'README.md',
    skill: 'README_TEMPLATE.md',
    label: 'README Técnico',
    maxTokens: 4000,
  },
  ERASER: {
    output: 'ERASER-DSL.md',
    skill: 'ERASER_DSL_TEMPLATE.md',
    label: 'Diagramas Eraser.io',
    maxTokens: 4000,
  },
};

// ─── Parse CLI args ────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let projectName = null;
  let all = false;
  let baseDir = process.cwd();
  let outputDir = null;
  let docsFilter = null;
  let model = null;
  let dryRun = false;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectName = args[i + 1]; i++;
    } else if (args[i] === '--all') {
      all = true;
    } else if (args[i] === '--dir' && args[i + 1]) {
      baseDir = resolve(args[i + 1]); i++;
    } else if (args[i] === '--output-dir' && args[i + 1]) {
      outputDir = resolve(args[i + 1]); i++;
    } else if (args[i] === '--docs' && args[i + 1]) {
      docsFilter = args[i + 1].split(',').map(d => d.trim().toUpperCase()); i++;
    } else if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1]; i++;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp(); process.exit(0);
    }
  }

  return { projectName, all, baseDir, outputDir, docsFilter, model, dryRun, force };
}

function printHelp() {
  console.log(`
${c.bright}Replicant-2049 — Document Generator (GitHub Models)${c.reset}

${c.cyan}Usage:${c.reset}
  npx replicant generate [options]

${c.cyan}Options:${c.reset}
  --project NAME     Generate docs for a specific project
  --all              Generate docs for ALL projects in directory
  --dir PATH         Base directory with source code (default: cwd)
  --output-dir PATH  Output directory for generated docs (default: same as --dir)
  --docs DOC1,DOC2   Documents to generate: SRS,PLAN,CLAUDE,LOVABLE,README,ERASER
  --model MODEL      Model (default: ${DEFAULT_MODEL})
  --dry-run          Analyze project without calling API
  --force            Overwrite existing non-template documents
  --help, -h         Show this help

${c.cyan}Environment:${c.reset}
  GITHUB_TOKEN       Required. GitHub Personal Access Token.

${c.cyan}Examples:${c.reset}
  npx replicant generate --project APP-PAGOS-PENDIENTES
  npx replicant generate --all --dir "C:\\Proyectos\\NOR-PAN"
  npx replicant generate --all --dir "C:\\Proyectos\\NOR-PAN" --output-dir "C:\\test"
  npx replicant generate --project TC --docs SRS,PLAN
  npx replicant generate --project TC --model claude-opus-4-20250514
  npx replicant generate --project TC --dry-run
`);
}

// ─── GitHub Models API call ────────────────────────────────────
async function callGitHubModels(token, model, systemPrompt, userContent, maxTokens) {
  const response = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const status = response.status;

    if (status === 401) throw new Error('GITHUB_TOKEN inválido o expirado.');
    if (status === 403) throw new Error('Sin acceso a GitHub Models. Verifica permisos del token.');
    if (status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitSecs = retryAfter ? parseInt(retryAfter, 10) : 30;
      throw new Error(`Rate limit alcanzado. Reintentar en ${waitSecs}s.`);
    }
    if (status === 404) throw new Error(`Modelo ${model} no disponible en GitHub Models.`);
    
    throw new Error(`GitHub Models API error (${status}): ${errorBody.substring(0, 200)}`);
  }

  return await response.json();
}

// ─── Sleep utility ─────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Discover projects ─────────────────────────────────────────
function discoverProjects(sourceDir, outputDir) {
  const projects = [];
  const outDir = outputDir || sourceDir;

  try {
    // Look for -more folders in BOTH source and output dirs
    const sourceFolders = new Set();
    const outputFolders = new Set();

    try {
      readdirSync(sourceDir)
        .filter(item => item.endsWith('-more') && statSync(join(sourceDir, item)).isDirectory())
        .forEach(f => sourceFolders.add(f));
    } catch {}

    if (outDir !== sourceDir) {
      try {
        readdirSync(outDir)
          .filter(item => item.endsWith('-more') && statSync(join(outDir, item)).isDirectory())
          .forEach(f => outputFolders.add(f));
      } catch {}
    }

    // Merge: use output dir -more folders, plus any from source not already covered
    const allMoreFolders = new Set([...outputFolders, ...sourceFolders]);

    for (const moreFolder of allMoreFolders) {
      const projectCode = moreFolder.replace(/-more$/, '');
      projects.push({
        code: projectCode,
        dir: sourceDir,
        moreDir: join(outDir, moreFolder),
      });
    }
  } catch {}

  return projects;
}

// ─── Load config for a project ─────────────────────────────────
async function loadProjectConfig(projectDir) {
  const configPaths = [
    join(projectDir, 'project.config.js'),
    join(projectDir, 'project.config.mjs'),
  ];

  for (const cfgPath of configPaths) {
    if (existsSync(cfgPath)) {
      try {
        const configModule = await import(pathToFileURL(cfgPath).href);
        return configModule.default;
      } catch {}
    }
  }

  return null;
}

// ─── Load skill template ──────────────────────────────────────
function loadSkillTemplate(skillFilename) {
  const skillPath = join(SKILLS_DIR, skillFilename);
  if (!existsSync(skillPath)) {
    log.warn(`Skill template not found: ${skillFilename}`);
    return null;
  }
  return readFileSync(skillPath, 'utf8');
}

// ─── Check if doc already exists and has real content ──────────
function docNeedsGeneration(moreDir, docFilename, force) {
  const filePath = join(moreDir, docFilename);
  
  if (!existsSync(filePath)) return true;
  if (force) return true;
  
  const content = readFileSync(filePath, 'utf8');
  
  // It's a template if it contains placeholders
  if (content.includes('{{PROYECTO}}') || content.includes('{{CLIENTE}}')) {
    return true;
  }
  
  // It's already generated (has real content)
  if (content.length > 500) {
    return false;
  }
  
  return true;
}

// ─── Compress context for API token limits ─────────────────────
function compressContext(context, maxTokens) {
  const estimated = estimateTokens(context);
  if (estimated <= maxTokens) return context;

  // Strategy: keep structure info, trim source code content
  const lines = context.split('\n');
  const compressed = [];
  let inCodeBlock = false;
  let codeLineCount = 0;
  const maxCodeLines = 8; // Keep only first N lines of each code snippet

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLineCount = 0;
        compressed.push(line);
      } else {
        inCodeBlock = false;
        compressed.push(line);
      }
      continue;
    }

    if (inCodeBlock) {
      codeLineCount++;
      if (codeLineCount <= maxCodeLines) {
        compressed.push(line);
      } else if (codeLineCount === maxCodeLines + 1) {
        compressed.push('  // ... (truncado)');
      }
    } else {
      compressed.push(line);
    }
  }

  let result = compressed.join('\n');
  
  // If still too long, do aggressive truncation
  if (estimateTokens(result) > maxTokens) {
    // Remove all code blocks entirely, keep only headers and lists
    const aggressive = [];
    let skip = false;
    for (const line of result.split('\n')) {
      if (line.startsWith('```')) {
        skip = !skip;
        if (!skip) aggressive.push('(código omitido por límite de tokens)');
        continue;
      }
      if (!skip) aggressive.push(line);
    }
    result = aggressive.join('\n');
  }

  // Final hard truncation if needed
  if (estimateTokens(result) > maxTokens) {
    const chars = Math.floor(maxTokens * 3.5); // ~3.5 chars per token
    result = result.substring(0, chars) + '\n\n... (contexto truncado por límite de tokens)';
  }

  return result;
}

// ─── Compress skill template ──────────────────────────────
function compressSkill(skill) {
  // Remove example blocks and excessive whitespace from skill templates
  const lines = skill.split('\n');
  const compressed = [];
  let inExample = false;
  
  for (const line of lines) {
    if (line.includes('<!-- ejemplo') || line.includes('```ejemplo') || line.match(/^>.*ejemplo/i)) {
      inExample = true;
      continue;
    }
    if (inExample && (line.startsWith('#') || line === '---')) {
      inExample = false;
    }
    if (!inExample) {
      // Remove excessive blank lines
      if (line.trim() === '' && compressed.length > 0 && compressed[compressed.length - 1].trim() === '') continue;
      compressed.push(line);
    }
  }
  
  return compressed.join('\n');
}

// ─── Strip wrapping code fences ────────────────────────────────
function stripCodeFences(text) {
  // Remove ```markdown or ``` wrapper that models add around the output
  let result = text.trim();
  
  // Check if entire response is wrapped in a single code fence
  const fenceMatch = result.match(/^```(?:markdown|md)?\s*\n([\s\S]*)\n```\s*$/);
  if (fenceMatch) {
    result = fenceMatch[1];
  }
  
  return result.trim();
}

// ─── Build system prompt ───────────────────────────────────────
function buildSystemPrompt(docType, skillTemplate, config) {
  const clientName = config?.client?.name || 'INCBA';
  const teamPm = config?.team?.pm || 'Felipe Rebolledo';
  const teamDev = config?.team?.developer || 'Camilo Acencio';
  const compressedSkill = compressSkill(skillTemplate);

  return `Eres un redactor técnico senior de INCBA. Genera documentos profesionales para proyectos de software.

REGLAS:
1. Documento COMPLETO, no parcial
2. Usa datos reales del análisis, NO placeholders como {{PROYECTO}}
3. Markdown profesional, en español
4. Específico y técnico

EQUIPO: Cliente: ${clientName} | PM: ${teamPm} | Dev: ${teamDev} | Año: ${new Date().getFullYear()}

SKILL:
${compressedSkill}`;
}

// ─── Strip context to structure-only (no source code) ──────────
function structureOnlyContext(context) {
  // For ERASER diagrams we only need architecture info, not code
  const lines = context.split('\n');
  const result = [];
  let inCodeBlock = false;
  
  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    
    // Keep headers, lists, and structural info
    if (line.startsWith('#') || line.startsWith('-') || line.startsWith('*') ||
        line.startsWith('|') || line.includes(':') || line.trim() === '') {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

// ─── Generate a single document ────────────────────────────────
async function generateDocument(token, model, docType, docDef, projectContext, config) {
  const skill = loadSkillTemplate(docDef.skill);
  if (!skill) {
    return { success: false, error: 'Skill template not found', usage: { prompt_tokens: 0, completion_tokens: 0 } };
  }

  const systemPrompt = buildSystemPrompt(docType, skill, config);
  
  // Calculate available tokens for user content
  const systemTokens = estimateTokens(systemPrompt);
  const availableForUser = MAX_INPUT_TOKENS - systemTokens - 200; // 200 token margin
  
  // For ERASER docs, use structure-only context (avoids content filter triggers)
  let contextForDoc = projectContext;
  if (docType === 'ERASER') {
    contextForDoc = structureOnlyContext(projectContext);
  }
  
  // Compress project context to fit within limits
  const compressedContext = compressContext(contextForDoc, Math.max(availableForUser - 200, 1000));

  // Sanitize context to avoid content filter triggers
  const sanitizedContext = compressedContext
    .replace(/password|secret|token|api[_-]?key|credential/gi, '***')
    .replace(/sk-[a-zA-Z0-9_-]+/g, '***')
    .replace(/ghp_[a-zA-Z0-9]+/g, '***')
    .replace(/Bearer [a-zA-Z0-9._-]+/g, 'Bearer ***');

  const userPrompt = `Genera ${docDef.label} (${docDef.output}).

CONTEXTO DEL PROYECTO:

${sanitizedContext}

---
Genera el documento completo en Markdown. Responde SOLO con el contenido del documento.`;

  try {
    const response = await callGitHubModels(token, model, systemPrompt, userPrompt, docDef.maxTokens);

    let content = response.choices?.[0]?.message?.content || '';
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };

    // Strip wrapping ```markdown code fences that models often add
    content = stripCodeFences(content);

    // ─── Plan Review Loop ────────────────────────────────────
    // Self-review: verify generated doc against template structure
    // This catches missing sections, placeholder leftovers, and structure gaps
    try {
      const reviewSystemPrompt = `Sos un revisor de documentación técnica. Tu trabajo es verificar que un documento generado cumple con la estructura del template original.

Reglas:
- Verificar que TODAS las secciones del template están presentes en el documento
- Verificar que NO quedan placeholders sin reemplazar ({{...}})
- Verificar que el contenido es específico del proyecto (no genérico)
- Si encontrás problemas, devolver el documento CORREGIDO
- Si el documento está bien, devolver "APPROVED" (exactamente esa palabra)

Respondé SOLO con "APPROVED" o con el documento corregido completo.`;

      const reviewUserPrompt = `TEMPLATE ORIGINAL (estructura esperada):\n\n${skill.substring(0, 2000)}\n\n---\n\nDOCUMENTO GENERADO PARA REVISAR:\n\n${content.substring(0, 6000)}\n\n---\n\nVerificá que el documento cumple con la estructura del template. Si está bien, respondé "APPROVED". Si hay problemas, devolvé el documento corregido.`;

      const reviewResponse = await callGitHubModels(token, model, reviewSystemPrompt, reviewUserPrompt, docDef.maxTokens);
      const reviewContent = reviewResponse.choices?.[0]?.message?.content || '';
      const reviewUsage = reviewResponse.usage || { prompt_tokens: 0, completion_tokens: 0 };

      // Accumulate review tokens
      usage.prompt_tokens += reviewUsage.prompt_tokens;
      usage.completion_tokens += reviewUsage.completion_tokens;

      // If review returned a corrected version (not just "APPROVED"), use it
      const trimmedReview = stripCodeFences(reviewContent).trim();
      if (trimmedReview && !trimmedReview.startsWith('APPROVED')) {
        content = trimmedReview;
      }
    } catch (reviewErr) {
      // Review failed — use original content, don't block generation
      // This is a best-effort enhancement
    }
    // ─── End Plan Review Loop ────────────────────────────────

    return {
      success: true,
      content,
      usage,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    };
  }
}

function formatNumber(n) {
  return n.toLocaleString('en-US');
}

// ─── Print final summary ──────────────────────────────────────
function printFinalSummary(results, totalUsage, model, startTime) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const modelLabel = MODELS[model]?.label || model;

  console.log('');
  console.log(`${c.bright}${'═'.repeat(60)}${c.reset}`);
  console.log(`${c.bright} REPLICANT 2049 — Generación Completada${c.reset}`);
  console.log(`${c.bright}${'═'.repeat(60)}${c.reset}`);
  console.log('');

  // Per-project results
  console.log(`${c.bright} Proyectos procesados: ${results.length}${c.reset}`);
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isLast = i === results.length - 1;
    const prefix = isLast ? ' └── ' : ' ├── ';
    const docsOk = r.docs.filter(d => d.success).length;
    const docsFail = r.docs.filter(d => !d.success && !d.skipped).length;
    const docsSkip = r.docs.filter(d => d.skipped).length;
    
    let status = `${c.green}✓${c.reset} ${docsOk} documentos`;
    if (docsFail > 0) status += ` ${c.red}✗ ${docsFail} errores${c.reset}`;
    if (docsSkip > 0) status += ` ${c.dim}⊘ ${docsSkip} omitidos${c.reset}`;
    
    console.log(`${prefix}${r.projectCode.padEnd(30)} ${status}`);
  }

  // Total docs
  const totalDocs = results.reduce((sum, r) => sum + r.docs.filter(d => d.success).length, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.docs.filter(d => d.skipped).length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.docs.filter(d => !d.success && !d.skipped).length, 0);

  console.log('');
  console.log(` Documentos generados: ${c.green}${totalDocs}${c.reset} total`);
  if (totalSkipped > 0) console.log(` Documentos omitidos:  ${c.dim}${totalSkipped}${c.reset} (ya existían, usar --force para sobreescribir)`);
  if (totalErrors > 0)  console.log(` Errores:              ${c.red}${totalErrors}${c.reset}`);

  console.log('');
  console.log(`${c.bright}${'═'.repeat(60)}${c.reset}`);
  console.log(`${c.bright} CONSUMO${c.reset}`);
  console.log(`${c.bright}${'═'.repeat(60)}${c.reset}`);
  console.log(` Input tokens:    ${formatNumber(totalUsage.prompt_tokens)}`);
  console.log(` Output tokens:   ${formatNumber(totalUsage.completion_tokens)}`);
  console.log(` Modelo:          ${modelLabel}`);
  console.log(` Tiempo:          ${elapsed}s`);
  console.log(` Costo:           ${c.green}$0.00${c.reset} (incluido en suscripción GitHub Copilot)`);
  console.log(`${c.bright}${'═'.repeat(60)}${c.reset}`);
  console.log('');
}

// ─── Process a single project ──────────────────────────────────
async function processProject(token, model, project, docsFilter, force, dryRun) {
  const result = {
    projectCode: project.code,
    moreDir: project.moreDir,
    docs: [],
  };

  log.title(`📂 Analizando: ${project.code}`);

  // Load project config
  const config = await loadProjectConfig(project.dir);

  // Analyze project
  const analysis = analyzeProject(project.dir, project.code, config);
  const context = analysisToContext(analysis);
  const estimatedInputTokens = estimateTokens(context);

  log.info(`Backend: ${analysis.summary.hasBackend ? `${analysis.summary.backendFramework} (${analysis.summary.controllerCount} controllers)` : 'No encontrado'}`);
  log.info(`Frontend: ${analysis.summary.hasFrontend ? `${analysis.summary.frontendFramework} (${analysis.summary.componentCount} componentes)` : 'No encontrado'}`);
  log.info(`Contexto: ~${formatNumber(estimatedInputTokens)} tokens estimados`);

  if (dryRun) {
    log.info(`${c.yellow}Dry-run: no se llamará a la API${c.reset}`);
    log.info(`Documentos que se generarían:`);
    for (const [docType, docDef] of Object.entries(DOC_DEFINITIONS)) {
      if (docsFilter && !docsFilter.includes(docType)) continue;
      const needs = docNeedsGeneration(project.moreDir, docDef.output, force);
      const status = needs ? `${c.green}Pendiente${c.reset}` : `${c.dim}Ya existe (omitir)${c.reset}`;
      console.log(`    ${docDef.output.padEnd(25)} ${status}`);
      result.docs.push({ docType, skipped: !needs, success: false });
    }
    return result;
  }

  // Ensure -more directory exists
  if (!existsSync(project.moreDir)) {
    mkdirSync(project.moreDir, { recursive: true });
    log.success(`Creada carpeta: ${project.moreDir}`);
  }

  // Generate each document
  const docsToGenerate = Object.entries(DOC_DEFINITIONS)
    .filter(([docType]) => !docsFilter || docsFilter.includes(docType));

  for (let i = 0; i < docsToGenerate.length; i++) {
    const [docType, docDef] = docsToGenerate[i];

    // Check if doc needs generation
    if (!docNeedsGeneration(project.moreDir, docDef.output, force)) {
      log.step(i + 1, docsToGenerate.length, `${c.dim}${docDef.output} — ya existe, omitiendo${c.reset}`);
      result.docs.push({ docType, skipped: true, success: false, usage: { prompt_tokens: 0, completion_tokens: 0 } });
      continue;
    }

    log.step(i + 1, docsToGenerate.length, `Generando ${docDef.label} (${docDef.output})...`);

    const genResult = await generateDocument(token, model, docType, docDef, context, config);

    if (genResult.success) {
      // Write document
      const outputPath = join(project.moreDir, docDef.output);
      writeFileSync(outputPath, genResult.content, 'utf8');
      log.success(`  ${docDef.output} generado (${formatNumber(genResult.usage.completion_tokens)} tokens)`);
      result.docs.push({ docType, success: true, skipped: false, usage: genResult.usage });
    } else {
      log.error(`  Error generando ${docDef.output}: ${genResult.error}`);
      result.docs.push({ docType, success: false, skipped: false, error: genResult.error, usage: genResult.usage });
    }

    // Rate limit delay between API calls
    if (i < docsToGenerate.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  return result;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  const startTime = Date.now();

  log.title('🤖 Replicant-2049 — Document Generator (GitHub Models)');

  // Check GitHub token
  const token = process.env.GITHUB_TOKEN;
  if (!token && !args.dryRun) {
    log.error('GITHUB_TOKEN no configurado.');
    log.info('Crea un Personal Access Token en: https://github.com/settings/tokens');
    log.info('Configura tu token:');
    log.info('  Windows:  $env:GITHUB_TOKEN = "ghp_..."');
    log.info('  Linux:    export GITHUB_TOKEN="ghp_..."');
    process.exit(1);
  }

  // Determine model
  const model = args.model || DEFAULT_MODEL;
  log.info(`Modelo: ${MODELS[model]?.label || model}`);

  // Discover projects
  let projects = [];

  // Determine output directory (defaults to same as source dir)
  const outputBaseDir = args.outputDir || args.baseDir;

  if (args.all) {
    projects = discoverProjects(args.baseDir, outputBaseDir);
    if (projects.length === 0) {
      log.error(`No se encontraron proyectos (*-more/) en: ${args.baseDir}`);
      process.exit(1);
    }
    log.info(`Encontrados ${projects.length} proyecto(s) en ${args.baseDir}`);
    if (args.outputDir) log.info(`Output: ${outputBaseDir}`);
  } else if (args.projectName) {
    // Check source dir has the project (backend/frontend)
    const moreDir = join(outputBaseDir, `${args.projectName}-more`);
    const srcMoreDir = join(args.baseDir, `${args.projectName}-more`);
    const actualMoreDir = existsSync(moreDir) ? moreDir : (existsSync(srcMoreDir) ? srcMoreDir : null);
    
    if (!actualMoreDir) {
      // Try case-insensitive in output dir first, then source dir
      const tryDirs = [outputBaseDir, args.baseDir];
      let found = null;
      for (const dir of tryDirs) {
        try {
          const items = readdirSync(dir);
          const target = `${args.projectName}-more`.toLowerCase();
          const match = items.find(item => item.toLowerCase() === target && statSync(join(dir, item)).isDirectory());
          if (match) { found = join(dir, match); break; }
        } catch {}
      }
      if (found) {
        projects.push({ code: args.projectName, dir: args.baseDir, moreDir: found });
      } else {
        // No -more folder found, will create it in output dir
        projects.push({ code: args.projectName, dir: args.baseDir, moreDir: join(outputBaseDir, `${args.projectName}-more`) });
      }
    } else {
      projects.push({ code: args.projectName, dir: args.baseDir, moreDir: existsSync(join(outputBaseDir, `${args.projectName}-more`)) ? join(outputBaseDir, `${args.projectName}-more`) : moreDir });
    }
    if (args.outputDir) log.info(`Output: ${outputBaseDir}`);
  } else {
    // Auto-detect from current directory
    projects = discoverProjects(args.baseDir, outputBaseDir);
    if (projects.length === 0) {
      log.error('No se encontraron proyectos. Usa --project NAME o --all');
      process.exit(1);
    }
    if (projects.length > 1) {
      log.warn('Múltiples proyectos encontrados:');
      projects.forEach(p => console.log(`  - ${p.code}`));
      log.info('Usa --project NAME para uno específico, o --all para todos');
      process.exit(1);
    }
  }

  // Process each project
  const results = [];
  const totalUsage = { prompt_tokens: 0, completion_tokens: 0 };

  for (let pi = 0; pi < projects.length; pi++) {
    const project = projects[pi];
    const result = await processProject(token, model, project, args.docsFilter, args.force, args.dryRun);
    results.push(result);

    // Accumulate usage
    for (const doc of result.docs) {
      if (doc.usage) {
        totalUsage.prompt_tokens += doc.usage.prompt_tokens;
        totalUsage.completion_tokens += doc.usage.completion_tokens;
      }
    }

    // Delay between projects to avoid rate limits
    if (pi < projects.length - 1 && !args.dryRun) {
      log.info(`${c.dim}Pausa entre proyectos (${RATE_LIMIT_DELAY_MS / 1000}s)...${c.reset}`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  // Print final summary
  if (!args.dryRun) {
    printFinalSummary(results, totalUsage, model, startTime);
  } else {
    console.log('');
    log.info(`${c.yellow}Dry-run completado. Ningún documento fue generado.${c.reset}`);
    log.info(`Para generar, ejecuta sin --dry-run`);
    console.log('');
  }
}

main().catch((err) => {
  log.error(err.message);
  if (err.message.includes('401') || err.message.includes('inválido')) {
    log.info('Token inválido. Genera uno nuevo en: https://github.com/settings/tokens');
  } else if (err.message.includes('429') || err.message.includes('Rate limit')) {
    log.info('Rate limit alcanzado. Espera un momento e intenta de nuevo.');
  }
  process.exit(1);
});
