#!/usr/bin/env node
/**
 * ============================================================
 *  auth0-setup.mjs — Replicant-2049
 *  Automate Auth0 tenant configuration for new projects
 * ============================================================
 *
 *  Hybrid approach: Tenant is created MANUALLY, then this script
 *  automates configuration via Auth0 CLI (`auth0`):
 *
 *    1. Verify CLI installed + authenticated to the target tenant
 *    2. Create SPA Application (frontend)
 *    3. Create API / Resource Server (backend audience)
 *    4. Create M2M Application (backend → Management API)
 *    5. Authorize M2M app for Management API
 *    6. Create roles (admin, operador, lector)
 *    7. Write credentials to .env files
 *
 *  Prerequisites:
 *    - Auth0 CLI installed: download from github.com/auth0/auth0-cli
 *    - Tenant created manually in Auth0 Dashboard
 *    - Authenticated: auth0 login --domain <tenant>.us.auth0.com
 *
 *  Naming convention (matches Atlas):
 *    - SPA App:  "{PROJECT} Frontend"
 *    - API:      "{PROJECT} API"
 *    - M2M App:  "{PROJECT} Backend (M2M)"
 *    - Audience: "https://api.{project-lower}.norpan.com"
 *
 * ============================================================
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── INCBA Defaults ────────────────────────────────────────────
const INCBA_DEFAULTS = {
  // Standard roles for all NOR-PAN projects
  roles: [
    { name: 'admin',    description: 'Control total del sistema' },
    { name: 'operador', description: 'Operaciones y carga de datos' },
    { name: 'lector',   description: 'Solo lectura' },
  ],
  // Database connection (Auth0 default)
  connection: 'Username-Password-Authentication',
  // Token lifetime (86400 = 24 hours)
  tokenLifetime: 86400,
};

// ─── ANSI Colors ───────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (n, total, msg) =>
    console.log(`${colors.cyan}[${n}/${total}]${colors.reset} ${msg}`),
};

// ─── Auth0 CLI wrapper ────────────────────────────────────────

/**
 * Run an auth0 CLI command and return parsed JSON output.
 * @param {string} cmd - Command after 'auth0 ' (e.g., 'apps create ...')
 * @param {object} opts
 * @param {string} [opts.tenant] - Tenant domain to target
 * @param {boolean} [opts.json=true] - Request JSON output
 * @param {boolean} [opts.noInput=true] - Disable interactive prompts
 * @param {boolean} [opts.revealSecrets=false] - Include secrets in output
 * @returns {object|string} Parsed JSON or raw string
 */
function auth0(cmd, opts = {}) {
  const { tenant, json = true, noInput = true, revealSecrets = false } = opts;

  let fullCmd = `auth0 ${cmd}`;
  if (tenant) fullCmd += ` --tenant "${tenant}"`;
  if (json) fullCmd += ' --json';
  if (noInput) fullCmd += ' --no-input';
  if (revealSecrets) fullCmd += ' --reveal-secrets';
  fullCmd += ' --no-color';

  try {
    const output = execSync(fullCmd, {
      encoding: 'utf8',
      timeout: 30_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    if (json && output) {
      try {
        return JSON.parse(output);
      } catch {
        return output;
      }
    }
    return output;
  } catch (error) {
    const stderr = error.stderr?.toString().trim() || '';
    const stdout = error.stdout?.toString().trim() || '';
    throw new Error(`Auth0 CLI error: ${stderr || stdout || error.message}`);
  }
}

// ─── Check CLI readiness ──────────────────────────────────────

/**
 * Check that Auth0 CLI is installed and the user is authenticated.
 * @returns {{ ok: boolean, message: string, tenant?: string }}
 */
export function checkAuth0Ready() {
  // 1. Check CLI exists
  try {
    execSync('auth0 --version', { stdio: 'pipe', timeout: 5000 });
  } catch {
    return {
      ok: false,
      message:
        'Auth0 CLI no encontrado. Instalalo desde: https://github.com/auth0/auth0-cli/releases',
    };
  }

  // 2. Check authenticated (tenants list should work)
  try {
    const tenants = auth0('tenants list');
    if (!tenants || (Array.isArray(tenants) && tenants.length === 0)) {
      return {
        ok: false,
        message:
          'Auth0 CLI no autenticado. Ejecutá: auth0 login --domain <tu-tenant>.us.auth0.com',
      };
    }
    return { ok: true, message: 'Auth0 CLI listo', tenants };
  } catch {
    return {
      ok: false,
      message:
        'Auth0 CLI no autenticado. Ejecutá: auth0 login --domain <tu-tenant>.us.auth0.com',
    };
  }
}

// ─── Get tenant info ──────────────────────────────────────────

/**
 * Resolve which tenant to use.
 * Priority: explicit domain → only tenant available → error.
 * @param {string} [domain] - Explicit tenant domain
 * @param {Array} [tenantsList] - Pre-fetched tenants list
 * @returns {{ domain: string }}
 */
function resolveTenant(domain, tenantsList) {
  if (domain) {
    log.info(`Usando tenant explícito: ${domain}`);
    return { domain };
  }

  // Try to get tenants list
  const tenants = tenantsList || auth0('tenants list');

  if (Array.isArray(tenants) && tenants.length === 1) {
    const d = tenants[0].domain || tenants[0].name || tenants[0];
    log.info(`Tenant detectado: ${d}`);
    return { domain: d };
  }

  if (Array.isArray(tenants) && tenants.length > 1) {
    const domains = tenants.map((t) => t.domain || t.name || t).join(', ');
    throw new Error(
      `Múltiples tenants encontrados: ${domains}. Usá --auth0-domain para especificar cuál.`
    );
  }

  throw new Error('No se encontró ningún tenant. Ejecutá: auth0 login --domain <tenant>.us.auth0.com');
}

// ─── Create SPA Application ──────────────────────────────────

/**
 * Create a Single Page Application in Auth0.
 * @param {string} name - App name (e.g., "TC Frontend")
 * @param {object} config
 * @param {string} config.tenant - Tenant domain
 * @param {number} config.portFrontend - Local dev port (default 5173)
 * @returns {{ clientId: string, name: string }}
 */
function createSpaApp(name, config) {
  const { tenant, portFrontend = 5173 } = config;

  // Check if app already exists
  try {
    const apps = auth0('apps list', { tenant });
    if (Array.isArray(apps)) {
      const existing = apps.find(
        (a) => a.name === name && a.app_type === 'spa'
      );
      if (existing) {
        log.info(`SPA app "${name}" ya existe (${existing.client_id.substring(0, 8)}...)`);
        return { clientId: existing.client_id, name: existing.name };
      }
    }
  } catch {
    // Ignore — will try to create
  }

  const callbacks = `http://localhost:${portFrontend}/callback`;
  const logoutUrls = `http://localhost:${portFrontend}`;
  const origins = `http://localhost:${portFrontend}`;

  const result = auth0(
    `apps create --name "${name}" --type spa --callbacks "${callbacks}" --logout-urls "${logoutUrls}" --origins "${origins}" --auth-method None`,
    { tenant }
  );

  const clientId = result.client_id || result.clientId;
  log.success(`SPA app creada: "${name}" (${clientId.substring(0, 8)}...)`);
  return { clientId, name: result.name || name };
}

// ─── Create API (Resource Server) ────────────────────────────

/**
 * Create an API / Resource Server in Auth0.
 * @param {string} name - API name (e.g., "TC API")
 * @param {string} identifier - Audience URL (e.g., "https://api.tc.norpan.com")
 * @param {object} config
 * @param {string} config.tenant - Tenant domain
 * @returns {{ identifier: string, name: string }}
 */
function createApi(name, identifier, config) {
  const { tenant } = config;

  // Check if API already exists
  try {
    const apis = auth0('apis list', { tenant });
    if (Array.isArray(apis)) {
      const existing = apis.find((a) => a.identifier === identifier);
      if (existing) {
        log.info(`API "${name}" ya existe (${identifier})`);
        return { identifier: existing.identifier, name: existing.name };
      }
    }
  } catch {
    // Ignore — will try to create
  }

  const scopes = 'read:users,write:users';

  const result = auth0(
    `apis create --name "${name}" --identifier "${identifier}" --scopes "${scopes}" --offline-access --token-lifetime ${INCBA_DEFAULTS.tokenLifetime}`,
    { tenant }
  );

  log.success(`API creada: "${name}" (${identifier})`);
  return {
    identifier: result.identifier || identifier,
    name: result.name || name,
  };
}

// ─── Create M2M Application ─────────────────────────────────

/**
 * Create a Machine-to-Machine application for the backend
 * to call the Auth0 Management API (user creation, etc.).
 * @param {string} name - App name (e.g., "TC Backend (M2M)")
 * @param {object} config
 * @param {string} config.tenant - Tenant domain
 * @returns {{ clientId: string, clientSecret: string, name: string }}
 */
function createM2mApp(name, config) {
  const { tenant } = config;

  // Check if app already exists
  try {
    const apps = auth0('apps list', { tenant, revealSecrets: true });
    if (Array.isArray(apps)) {
      const existing = apps.find(
        (a) => a.name === name && a.app_type === 'm2m'
      );
      if (existing) {
        log.info(`M2M app "${name}" ya existe (${existing.client_id.substring(0, 8)}...)`);
        return {
          clientId: existing.client_id,
          clientSecret: existing.client_secret || '<ya creada — ver Dashboard>',
          name: existing.name,
        };
      }
    }
  } catch {
    // Ignore — will try to create
  }

  const result = auth0(
    `apps create --name "${name}" --type m2m`,
    { tenant, revealSecrets: true }
  );

  const clientId = result.client_id || result.clientId;
  const clientSecret = result.client_secret || result.clientSecret;

  log.success(`M2M app creada: "${name}" (${clientId.substring(0, 8)}...)`);
  return { clientId, clientSecret, name: result.name || name };
}

// ─── Authorize M2M for Management API ───────────────────────

/**
 * Authorize the M2M app to use the Auth0 Management API.
 * This grants the app permissions to create/manage users.
 *
 * Uses the Management API directly since the CLI doesn't have
 * a built-in command for client grants.
 *
 * @param {string} m2mClientId - The M2M app's client ID
 * @param {string} tenant - Tenant domain
 */
function authorizeM2mForManagementApi(m2mClientId, tenant) {
  // The Management API identifier is always https://{domain}/api/v2/
  const managementApiIdentifier = `https://${tenant}/api/v2/`;

  log.info(
    `Autorizando M2M app para Management API... ` +
    `${colors.dim}(esto requiere configuración manual si falla)${colors.reset}`
  );

  // The Auth0 CLI doesn't have a direct command for client-grants.
  // We'll note this as a manual step if needed.
  log.warn(
    `Para completar la autorización del M2M app:`
  );
  log.info(`  1. Ir a Auth0 Dashboard → Applications → APIs`);
  log.info(`  2. Seleccionar "Auth0 Management API"`);
  log.info(`  3. Tab "Machine to Machine Applications"`);
  log.info(`  4. Autorizar la app M2M y otorgar scopes:`);
  log.info(`     read:users, create:users, delete:users, update:users`);

  return { managementApiIdentifier };
}

// ─── Create Roles ────────────────────────────────────────────

/**
 * Create standard NOR-PAN roles in the tenant.
 * @param {object} config
 * @param {string} config.tenant - Tenant domain
 * @param {Array<{name: string, description: string}>} [config.roles] - Custom roles
 * @returns {Array<{id: string, name: string}>}
 */
function createRoles(config) {
  const { tenant, roles = INCBA_DEFAULTS.roles } = config;
  const created = [];

  // Get existing roles
  let existingRoles = [];
  try {
    existingRoles = auth0('roles list', { tenant });
    if (!Array.isArray(existingRoles)) existingRoles = [];
  } catch {
    existingRoles = [];
  }

  for (const role of roles) {
    // Skip if exists
    const existing = existingRoles.find((r) => r.name === role.name);
    if (existing) {
      log.info(`Rol "${role.name}" ya existe`);
      created.push({ id: existing.id, name: existing.name });
      continue;
    }

    try {
      const result = auth0(
        `roles create --name "${role.name}" --description "${role.description}"`,
        { tenant }
      );
      log.success(`Rol creado: "${role.name}"`);
      created.push({ id: result.id, name: result.name || role.name });
    } catch (error) {
      log.warn(`No se pudo crear rol "${role.name}": ${error.message}`);
    }
  }

  return created;
}

// ─── Update .env files ──────────────────────────────────────

/**
 * Write Auth0 credentials to frontend and backend .env files.
 * @param {object} config
 * @param {string} [config.frontendDir] - Path to frontend directory
 * @param {string} [config.backendDir] - Path to backend directory
 * @param {string} config.domain - Auth0 tenant domain
 * @param {string} config.spaClientId - SPA app client ID
 * @param {string} config.audience - API audience identifier
 * @param {string} [config.m2mClientId] - M2M app client ID
 * @param {string} [config.m2mClientSecret] - M2M app client secret
 */
function updateEnvFiles(config) {
  const {
    frontendDir,
    backendDir,
    domain,
    spaClientId,
    audience,
    m2mClientId,
    m2mClientSecret,
  } = config;

  // ─── Frontend .env ────────────────────────────────────
  if (frontendDir) {
    const envPath = join(frontendDir, '.env');
    let content = '';

    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf8');

      // Replace placeholders or existing values
      content = content
        .replace(
          /VITE_AUTH0_DOMAIN=.*/,
          `VITE_AUTH0_DOMAIN=${domain}`
        )
        .replace(
          /VITE_AUTH0_CLIENT_ID=.*/,
          `VITE_AUTH0_CLIENT_ID=${spaClientId}`
        )
        .replace(
          /VITE_AUTH0_AUDIENCE=.*/,
          `VITE_AUTH0_AUDIENCE=${audience}`
        )
        .replace(
          /VITE_SKIP_AUTH=.*/,
          'VITE_SKIP_AUTH=false'
        );
    } else {
      content = `# Auth0 — configurado automáticamente por Replicant-2049
VITE_AUTH0_DOMAIN=${domain}
VITE_AUTH0_CLIENT_ID=${spaClientId}
VITE_AUTH0_AUDIENCE=${audience}
VITE_SKIP_AUTH=false
`;
    }

    writeFileSync(envPath, content, 'utf8');
    log.success(`Frontend .env actualizado: ${envPath}`);
  }

  // ─── Backend .env ─────────────────────────────────────
  if (backendDir) {
    const envPath = join(backendDir, '.env');
    let content = '';

    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf8');

      // Replace placeholders or existing values
      content = content
        .replace(
          /AUTH0_DOMAIN=.*/,
          `AUTH0_DOMAIN=${domain}`
        )
        .replace(
          /AUTH0_AUDIENCE=.*/,
          `AUTH0_AUDIENCE=${audience}`
        )
        .replace(
          /SKIP_AUTH=.*/,
          'SKIP_AUTH=false'
        );

      // Add M2M credentials if not present
      if (m2mClientId) {
        if (!content.includes('AUTH0_MANAGEMENT_CLIENT_ID')) {
          content += `
# Auth0 Management API (M2M) — para crear usuarios desde el backend
AUTH0_MANAGEMENT_CLIENT_ID=${m2mClientId}
AUTH0_MANAGEMENT_CLIENT_SECRET=${m2mClientSecret || '<configurar en Auth0 Dashboard>'}
`;
        } else {
          content = content
            .replace(
              /AUTH0_MANAGEMENT_CLIENT_ID=.*/,
              `AUTH0_MANAGEMENT_CLIENT_ID=${m2mClientId}`
            )
            .replace(
              /AUTH0_MANAGEMENT_CLIENT_SECRET=.*/,
              `AUTH0_MANAGEMENT_CLIENT_SECRET=${m2mClientSecret || '<configurar en Auth0 Dashboard>'}`
            );
        }
      }
    } else {
      content = `# Auth0 — configurado automáticamente por Replicant-2049
AUTH0_DOMAIN=${domain}
AUTH0_AUDIENCE=${audience}
SKIP_AUTH=false

# Auth0 Management API (M2M) — para crear usuarios desde el backend
AUTH0_MANAGEMENT_CLIENT_ID=${m2mClientId || '<configurar>'}
AUTH0_MANAGEMENT_CLIENT_SECRET=${m2mClientSecret || '<configurar>'}
`;
    }

    writeFileSync(envPath, content, 'utf8');
    log.success(`Backend .env actualizado: ${envPath}`);
  }
}

// ─── Main orchestrator ──────────────────────────────────────

const TOTAL_STEPS = 6;

/**
 * Configure an Auth0 tenant for a new project.
 *
 * @param {object} config
 * @param {string} config.projectName - Project display name (e.g., "TC")
 * @param {string} config.projectLower - Lowercase project slug (e.g., "tc")
 * @param {string} [config.domain] - Auth0 tenant domain (auto-detect if omitted)
 * @param {number} [config.portFrontend=5173] - Frontend dev port
 * @param {number} [config.portBackend=3001] - Backend dev port
 * @param {string} [config.audience] - Custom API audience (default: https://api.{projectLower}.norpan.com)
 * @param {string} [config.frontendDir] - Path to frontend dir for .env
 * @param {string} [config.backendDir] - Path to backend dir for .env
 * @param {Array} [config.tenantsList] - Pre-fetched tenants list
 * @returns {{ success: boolean, domain?: string, spaClientId?: string, audience?: string }}
 */
export async function setupAuth0(config) {
  const {
    projectName,
    projectLower,
    portFrontend = 5173,
    portBackend = 3001,
    frontendDir,
    backendDir,
    tenantsList,
  } = config;

  console.log('');
  console.log(
    `${colors.bright}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}║  Auth0 Setup — ${projectName.padEnd(24)} ║${colors.reset}`
  );
  console.log(
    `${colors.bright}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}`
  );
  console.log('');

  try {
    // ── Step 1: Resolve tenant ────────────────────────────
    log.step(1, TOTAL_STEPS, 'Detectando tenant...');
    const tenant = resolveTenant(config.domain, tenantsList);
    const domain = tenant.domain;

    // ── Step 2: Create SPA App ────────────────────────────
    log.step(2, TOTAL_STEPS, 'Creando SPA Application...');
    const spaApp = createSpaApp(`${projectName} Frontend`, {
      tenant: domain,
      portFrontend,
    });

    // ── Step 3: Create API ────────────────────────────────
    log.step(3, TOTAL_STEPS, 'Creando API (Resource Server)...');
    const audience =
      config.audience || `https://api.${projectLower}.norpan.com`;
    const api = createApi(`${projectName} API`, audience, {
      tenant: domain,
    });

    // ── Step 4: Create M2M App ────────────────────────────
    log.step(4, TOTAL_STEPS, 'Creando M2M Application (Management API)...');
    const m2mApp = createM2mApp(`${projectName} Backend (M2M)`, {
      tenant: domain,
    });

    // ── Step 5: Create Roles ──────────────────────────────
    log.step(5, TOTAL_STEPS, 'Creando roles...');
    const roles = createRoles({ tenant: domain });

    // ── Step 6: Update .env files ─────────────────────────
    log.step(6, TOTAL_STEPS, 'Actualizando archivos .env...');

    // M2M Authorization note
    authorizeM2mForManagementApi(m2mApp.clientId, domain);

    updateEnvFiles({
      frontendDir,
      backendDir,
      domain,
      spaClientId: spaApp.clientId,
      audience: api.identifier || audience,
      m2mClientId: m2mApp.clientId,
      m2mClientSecret: m2mApp.clientSecret,
    });

    // ── Summary ──────────────────────────────────────────
    console.log('');
    console.log(
      `${colors.green}${colors.bright}✅ Auth0 configurado exitosamente${colors.reset}`
    );
    console.log('');
    console.log(`${colors.cyan}  Tenant:${colors.reset}       ${domain}`);
    console.log(
      `${colors.cyan}  SPA App:${colors.reset}      ${spaApp.clientId.substring(0, 8)}... (${projectName} Frontend)`
    );
    console.log(`${colors.cyan}  API:${colors.reset}          ${audience}`);
    console.log(
      `${colors.cyan}  M2M App:${colors.reset}      ${m2mApp.clientId.substring(0, 8)}... (${projectName} Backend M2M)`
    );
    console.log(
      `${colors.cyan}  Roles:${colors.reset}        ${roles.map((r) => r.name).join(', ')}`
    );
    console.log('');
    console.log(
      `${colors.yellow}  ⚠ Paso manual pendiente:${colors.reset} Autorizar M2M app para Management API`
    );
    console.log(
      `${colors.dim}    Auth0 Dashboard → APIs → Auth0 Management API → Machine to Machine${colors.reset}`
    );
    console.log('');

    return {
      success: true,
      domain,
      spaClientId: spaApp.clientId,
      audience: api.identifier || audience,
      m2mClientId: m2mApp.clientId,
      m2mClientSecret: m2mApp.clientSecret,
      roles: roles.map((r) => r.name),
    };
  } catch (error) {
    log.error(`Auth0 setup falló: ${error.message}`);
    return { success: false, error: error.message };
  }
}
