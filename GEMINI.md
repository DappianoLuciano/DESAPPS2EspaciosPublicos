# Directivas de Ejecución para Gemini 3.1 Pro

## 1. Modificaciones Quirúrgicas (Zero Re-writes)
- NUNCA reescribas un archivo completo para aplicar cambios menores o medianos.
- Prohibido reemplazar código existente con comentarios del tipo `// ... resto del código`, `// TODO: mantener implementación previa` o resumir funciones.
- No agregues dependencias nuevas a `package.json` a menos que se te ordene explícitamente.
- Preservá estrictamente los comentarios, tipos existentes y firmas de funciones que no estén directamente involucrados en la tarea.

## 2. Bucle de Verificación Obligatorio (Exit Code 0)
- NUNCA des por completada una tarea sin haber ejecutado la validación en la terminal.
- Tras editar código, ejecutá inmediatamente el chequeo de tipos o el linter (`npm run typecheck`, `npx tsc --noEmit` o el comando configurado).
- Si el compilador arroja un error, no asumas el motivo: leé el trace exacto, inspeccioná la línea que falló y corregí el error antes de responder.
- Si una prueba falla tras tu cambio, hacé rollback de tu hipótesis antes de introducir capas adicionales de abstracción.

## 3. Manejo de Tipos y Arquitectura
- Modo TypeScript estricto: prohibido el uso de `any` o aserciones de tipo inseguras (`as unknown as X`).
- Si modificás una interfaz o tipo compartido, buscá todos sus usos en el proyecto antes de guardar los cambios para evitar romper contratos de API interna.
- Mantené las convenciones de nomenclatura y patrones de diseño ya presentes en el codebase local.

## 4. Gestión de Contexto
- No leas directorios enteros ni abras archivos irrelevantes de forma especulativa.
- Limitá las herramientas de lectura estrictamente a los archivos importados directos o a las definiciones de tipos que necesites inspeccionar.
