import crypto, { KeyObject } from "node:crypto";
import jwt from "jsonwebtoken";

export interface JwkKey {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n: string;
  e: string;
  [key: string]: unknown;
}

export interface CityPassIdentity {
  sub: string;
  preferredUsername: string;
  groups: string[];
  isAdmin: boolean;
  jti?: string;
}

export interface CityPassVerifierOptions {
  issuer?: string;
  audience?: string;
  jwksUrl?: string;
  adminGroups?: string[];
  fetchJwksFn?: (url: string) => Promise<{ keys: JwkKey[] }>;
  clockToleranceSeconds?: number;
  cacheTtlMs?: number;
  strictAudienceList?: boolean;
}

const DEFAULT_ISSUER = "https://idp.citypass.local";
const DEFAULT_AUDIENCE = "citypass-espacios-api";
// El IdP declara este issuer, pero publica sus claves de firma en la URL desplegada.
const DEFAULT_JWKS_URL = "https://api.citypass-login.pp.ua/.well-known/jwks.json";
const DEFAULT_ADMIN_GROUPS = ["admin", "espacios-admin", "administrador", "municipal_admin", "delegados", "soporte-n2"];
const DEFAULT_CLOCK_TOLERANCE_SECONDS = 60;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const DEFAULT_JWKS_TIMEOUT_MS = 2_000;

export class CityPassTokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly jwksUrl: string;
  private readonly adminGroups: Set<string>;
  private readonly clockToleranceSeconds: number;
  private readonly cacheTtlMs: number;
  private readonly strictAudienceList: boolean;
  private readonly fetchJwksFn?: (url: string) => Promise<{ keys: JwkKey[] }>;

  private keyCache: Map<string, KeyObject> = new Map();
  private cacheExpiresAt = 0;

  constructor(options: CityPassVerifierOptions = {}) {
    this.issuer = options.issuer || process.env.CITYPASS_IDP_ISSUER || DEFAULT_ISSUER;
    this.audience = options.audience || process.env.CITYPASS_IDP_AUDIENCE || DEFAULT_AUDIENCE;
    this.jwksUrl = options.jwksUrl || process.env.CITYPASS_IDP_JWKS_URL || DEFAULT_JWKS_URL;

    const envGroups = process.env.CITYPASS_ADMIN_GROUPS
      ? process.env.CITYPASS_ADMIN_GROUPS.split(",").map((group) => group.trim().toLowerCase())
      : DEFAULT_ADMIN_GROUPS;

    const configGroups = options.adminGroups
      ? options.adminGroups.map((group) => group.trim().toLowerCase())
      : envGroups;

    this.adminGroups = new Set(configGroups);
    this.clockToleranceSeconds = options.clockToleranceSeconds ?? DEFAULT_CLOCK_TOLERANCE_SECONDS;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.strictAudienceList = options.strictAudienceList ?? (process.env.CITYPASS_STRICT_AUDIENCE === "true");
    this.fetchJwksFn = options.fetchJwksFn;
  }

  async verify(token: string): Promise<CityPassIdentity | null> {
    try {
      if (typeof token !== "string" || !token.trim()) {
        return null;
      }

      // Paso 1: Inspeccionar encabezado del JWT (sin verificar todavía para obtener kid y alg)
      const decodedComplete = jwt.decode(token, { complete: true });
      if (!decodedComplete || typeof decodedComplete !== "object") {
        return null;
      }

      const header = decodedComplete.header;
      if (!header || typeof header !== "object") {
        return null;
      }

      // Paso 2: Lista blanca de algoritmos: solo RS256
      if (header.alg !== "RS256") {
        return null;
      }

      const kid = header.kid;
      if (typeof kid !== "string" || !kid.trim()) {
        return null;
      }

      // Paso 1 (continuación): Resolver clave de firma del JWKS
      const keyObject = await this.getKey(kid);
      if (!keyObject) {
        return null;
      }

      // Paso 2 y 5: Verificar firma con RS256 y expiración
      const payload = jwt.verify(token, keyObject, {
        algorithms: ["RS256"],
        clockTolerance: this.clockToleranceSeconds
      });

      if (!payload || typeof payload !== "object") {
        return null;
      }

      const tokenRecord = payload as Record<string, unknown>;

      // Paso 3: iss exacto
      if (tokenRecord.iss !== this.issuer) {
        return null;
      }

      // Paso 4: aud es una lista o string (si no strictAudienceList) y debe contener la audiencia configurada
      let audiences: unknown[] = [];
      if (Array.isArray(tokenRecord.aud)) {
        audiences = tokenRecord.aud;
      } else if (typeof tokenRecord.aud === "string" && !this.strictAudienceList) {
        audiences = [tokenRecord.aud];
      } else {
        return null;
      }

      const hasAudience = audiences.some((aud) => aud === this.audience);
      if (!hasAudience) {
        return null;
      }

      // Trampa 1: Exigir obligatoriamente que exp exista y sea un numero
      if (typeof tokenRecord.exp !== "number" || Number.isNaN(tokenRecord.exp)) {
        return null;
      }

      // Paso 6: token_use debe ser "human"
      if (tokenRecord.token_use !== "human") {
        return null;
      }

      // Paso 7: Tipos obligatorios
      // ver === 1
      if (tokenRecord.ver !== 1) {
        return null;
      }

      // sub: string no vacio
      if (typeof tokenRecord.sub !== "string" || !tokenRecord.sub.trim()) {
        return null;
      }

      // groups: lista de strings (puede ser vacia)
      if (!Array.isArray(tokenRecord.groups)) {
        return null;
      }

      const rawGroups = tokenRecord.groups as unknown[];
      const isEveryString = rawGroups.every((item) => typeof item === "string");
      if (!isEveryString) {
        return null;
      }

      const groups = rawGroups as string[];

      // preferred_username: string
      const preferredUsername =
        typeof tokenRecord.preferred_username === "string" && tokenRecord.preferred_username.trim()
          ? tokenRecord.preferred_username.trim()
          : tokenRecord.sub;

      // Paso 7: Autorizacion segun groups
      const isAdmin = groups.some((group) => this.adminGroups.has(group.toLowerCase()));

      const jti = typeof tokenRecord.jti === "string" ? tokenRecord.jti : undefined;

      return {
        sub: tokenRecord.sub,
        preferredUsername,
        groups,
        isAdmin,
        jti
      };
    } catch {
      return null;
    }
  }

  private async getKey(kid: string): Promise<KeyObject | null> {
    const now = Date.now();

    // Si la clave ya esta en cache y no vencio el TTL, usarla
    if (this.keyCache.has(kid) && now < this.cacheExpiresAt) {
      return this.keyCache.get(kid) || null;
    }

    // Refrescar JWKS si expiro el cache o si el kid no esta en cache
    await this.refreshJwks();

    return this.keyCache.get(kid) || null;
  }

  private async refreshJwks(): Promise<void> {
    try {
      let jwksData: { keys: JwkKey[] };

      if (this.fetchJwksFn) {
        jwksData = await this.fetchJwksFn(this.jwksUrl);
      } else {
        const response = await fetch(this.jwksUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(Number(process.env.CITYPASS_JWKS_TIMEOUT_MS) || DEFAULT_JWKS_TIMEOUT_MS)
        });

        if (!response.ok) {
          return;
        }

        jwksData = (await response.json()) as { keys: JwkKey[] };
      }

      if (!jwksData || !Array.isArray(jwksData.keys)) {
        return;
      }

      const newCache = new Map<string, KeyObject>();

      for (const jwk of jwksData.keys) {
        if (!jwk.kid || jwk.kty !== "RSA") {
          continue;
        }

        try {
          const keyObject = crypto.createPublicKey({
            key: jwk as unknown as crypto.JsonWebKey,
            format: "jwk"
          });
          newCache.set(jwk.kid, keyObject);
        } catch {
          // Ignorar clave corrupta o formato incompatible
        }
      }

      this.keyCache = newCache;
      this.cacheExpiresAt = Date.now() + this.cacheTtlMs;
    } catch {
      // Error de red o descarga de JWKS
    }
  }
}
