# Configuración de SonarQube - Guía Completa

Esta guía te ayudará a configurar SonarQube/SonarCloud con tu proyecto existente.

## 🎯 Prerequisitos

- ✅ Proyecto creado en SonarQube/SonarCloud
- ✅ Token de autenticación generado
- ✅ Project Key del proyecto

## 🔐 Paso 1: Obtener información de SonarQube

### Si usas SonarCloud (cloud):

1. Ve a [sonarcloud.io](https://sonarcloud.io)
2. Selecciona tu proyecto
3. Ve a `Administration` → `Analysis Method`
4. Anota:
   - **Organization Key**: `tu-organizacion`
   - **Project Key**: `tu-organizacion_tu-proyecto`
   - **Token**: Genera uno nuevo si no lo tienes

5. **SONAR_HOST_URL**: `https://sonarcloud.io`

### Si usas SonarQube (self-hosted):

1. Ve a tu instancia de SonarQube (ej: `http://localhost:9000`)
2. Selecciona tu proyecto
3. Ve a `Project Settings` → `General Settings`
4. Anota:
   - **Project Key**: El identificador del proyecto
   - **Token**: Genera uno en `My Account` → `Security` → `Generate Tokens`

5. **SONAR_HOST_URL**: URL de tu instancia (ej: `http://sonarqube.tu-empresa.com`)

## 🔑 Paso 2: Configurar Secrets en GitHub

Ve a tu repositorio → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Agrega estos secrets:

| Secret | Valor | Ejemplo |
|--------|-------|---------|
| `SONAR_TOKEN` | Token de autenticación | `sqp_abc123...` |
| `SONAR_HOST_URL` | URL de SonarQube/SonarCloud | `https://sonarcloud.io` |
| `SONAR_PROJECT_KEY_BACKEND` | Project Key del backend | `mi-org_espacios-backend` |
| `SONAR_PROJECT_KEY_FRONTEND` | Project Key del frontend | `mi-org_espacios-frontend` |

### Ejemplo para SonarCloud:

```
SONAR_TOKEN=sqp_abc123def456...
SONAR_HOST_URL=https://sonarcloud.io
SONAR_PROJECT_KEY_BACKEND=mi-organizacion_citypass-backend
SONAR_PROJECT_KEY_FRONTEND=mi-organizacion_citypass-frontend
```

### Ejemplo para SonarQube Self-Hosted:

```
SONAR_TOKEN=squ_abc123def456...
SONAR_HOST_URL=http://sonarqube.miempresa.com:9000
SONAR_PROJECT_KEY_BACKEND=citypass-espacios-backend
SONAR_PROJECT_KEY_FRONTEND=citypass-espacios-frontend
```

## 📝 Paso 3: Actualizar archivos de configuración

### Backend: `espacios-publicos-backend/sonar-project.properties`

Edita el archivo y actualiza:

```properties
# Cambiar esto por tu project key real
sonar.projectKey=TU_PROJECT_KEY_BACKEND

# Para SonarCloud, añadir también:
# sonar.organization=TU_ORGANIZACION
```

### Frontend: `espacios-publicos-frontend/sonar-project.properties`

Edita el archivo y actualiza:

```properties
# Cambiar esto por tu project key real
sonar.projectKey=TU_PROJECT_KEY_FRONTEND

# Para SonarCloud, añadir también:
# sonar.organization=TU_ORGANIZACION
```

## 🧪 Paso 4: Configurar Coverage en Backend (Opcional pero recomendado)

Para que SonarQube muestre cobertura de código, actualiza el `package.json` del backend:

```json
{
  "scripts": {
    "test": "jest --runInBand",
    "test:coverage": "jest --runInBand --coverage --coverageReporters=lcov"
  }
}
```

También asegúrate de tener esta configuración en `jest.config.js` o similar:

```javascript
module.exports = {
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
};
```

## 🚀 Paso 5: Ejecutar el análisis

### Opción 1: Automático (GitHub Actions)

El workflow se ejecuta automáticamente en:
- Push a `main` o `develop`
- Pull Requests
- Manualmente desde Actions

### Opción 2: Manual desde Actions

1. Ve a la pestaña `Actions`
2. Selecciona `SonarQube Analysis`
3. Click en `Run workflow`
4. Selecciona la branch
5. Click `Run workflow`

### Opción 3: Local (para testing)

#### Backend:
```bash
cd espacios-publicos-backend
npm test -- --coverage --coverageReporters=lcov

# Ejecutar scanner (requiere sonar-scanner instalado)
sonar-scanner \
  -Dsonar.token=TU_TOKEN \
  -Dsonar.host.url=TU_HOST_URL
```

#### Frontend:
```bash
cd espacios-publicos-frontend

# Ejecutar scanner
sonar-scanner \
  -Dsonar.token=TU_TOKEN \
  -Dsonar.host.url=TU_HOST_URL
```

## 📊 Paso 6: Ver resultados

### En SonarCloud:
1. Ve a [sonarcloud.io](https://sonarcloud.io)
2. Selecciona tu organización
3. Click en tu proyecto
4. Verás el dashboard con métricas

### En SonarQube Self-Hosted:
1. Ve a tu instancia de SonarQube
2. Click en tu proyecto
3. Verás el dashboard con métricas

## 🏆 Paso 7: Añadir Badges al README

### Para SonarCloud:

Edita `README.md` y añade después de los otros badges:

```markdown
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=TU_PROJECT_KEY_BACKEND&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=TU_PROJECT_KEY_BACKEND)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=TU_PROJECT_KEY_BACKEND&metric=coverage)](https://sonarcloud.io/summary/new_code?id=TU_PROJECT_KEY_BACKEND)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=TU_PROJECT_KEY_BACKEND&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=TU_PROJECT_KEY_BACKEND)
```

Reemplaza `TU_PROJECT_KEY_BACKEND` con tu project key real.

### Para SonarQube Self-Hosted:

```markdown
[![Quality Gate Status](http://tu-sonarqube.com/api/project_badges/measure?project=TU_PROJECT_KEY&metric=alert_status)](http://tu-sonarqube.com/dashboard?id=TU_PROJECT_KEY)
```

## 🔧 Configuración Avanzada

### Quality Gate personalizado

1. En SonarQube/SonarCloud, ve a `Quality Gates`
2. Crea un nuevo Quality Gate o edita el existente
3. Configura tus umbrales:
   - Coverage: > 80%
   - Duplications: < 3%
   - Maintainability Rating: A
   - Reliability Rating: A
   - Security Rating: A

4. Asigna el Quality Gate a tu proyecto

### Análisis de PRs (solo SonarCloud)

Para analizar Pull Requests automáticamente:

1. En SonarCloud, ve a `Administration` → `Analysis Method`
2. Habilita `Automatic Analysis`
3. O usa el workflow de GitHub Actions (ya configurado)

### Excluir archivos específicos

Edita `sonar-project.properties`:

```properties
# Excluir directorios
sonar.exclusions=**/migrations/**,**/generated/**

# Excluir archivos específicos
sonar.exclusions=src/legacy/**,src/deprecated/**
```

## 🔍 Troubleshooting

### Error: "Unauthorized"
**Causa:** Token inválido o expirado
**Solución:** Regenera el token en SonarQube y actualiza el secret `SONAR_TOKEN`

### Error: "Project not found"
**Causa:** Project Key incorrecto
**Solución:** Verifica que `SONAR_PROJECT_KEY_BACKEND/FRONTEND` coincida exactamente con el key en SonarQube

### Error: "Quality Gate failed"
**Causa:** El código no cumple los umbrales definidos
**Solución:** Revisa los issues en SonarQube y corrige el código. Puedes usar `continue-on-error: true` para no bloquear el pipeline.

### No se ve coverage
**Causa:** Tests no generan reporte lcov
**Solución:** 
1. Verifica que el script de tests tenga `--coverage --coverageReporters=lcov`
2. Verifica que el archivo `coverage/lcov.info` se genere
3. Verifica la ruta en `sonar.javascript.lcov.reportPaths`

### Análisis tarda mucho
**Causa:** Proyecto muy grande
**Solución:**
1. Aumenta las exclusiones en `sonar-project.properties`
2. Excluye `node_modules`, `dist`, `build`
3. Ejecuta análisis incremental (solo archivos modificados)

## 📚 Métricas Clave

SonarQube analiza:

- **Bugs**: Errores que afectan el comportamiento
- **Vulnerabilities**: Problemas de seguridad
- **Code Smells**: Código difícil de mantener
- **Coverage**: % de código cubierto por tests
- **Duplications**: Código duplicado
- **Security Hotspots**: Áreas sensibles a revisar

## ✅ Checklist Final

- [ ] Secrets configurados en GitHub (`SONAR_TOKEN`, `SONAR_HOST_URL`, etc.)
- [ ] `sonar-project.properties` actualizado con project keys correctos
- [ ] Tests backend generan coverage (`npm test -- --coverage`)
- [ ] Workflow ejecutado exitosamente
- [ ] Resultados visibles en SonarQube/SonarCloud
- [ ] Badges añadidos al README (opcional)
- [ ] Quality Gate configurado (opcional)

## 🎯 Próximos Pasos

1. **Configurar umbrales mínimos**: Define qué métricas son obligatorias
2. **Integrar en PR reviews**: Bloquear merge si Quality Gate falla
3. **Monitorear tendencias**: Revisar métricas semanalmente
4. **Reducir deuda técnica**: Trabajar en Code Smells y Duplications

## 🆘 Ayuda

- [SonarCloud Docs](https://docs.sonarcloud.io/)
- [SonarQube Docs](https://docs.sonarqube.org/)
- [GitHub Actions for SonarQube](https://github.com/SonarSource/sonarqube-scan-action)

---

**Última actualización:** 2026-09-03
