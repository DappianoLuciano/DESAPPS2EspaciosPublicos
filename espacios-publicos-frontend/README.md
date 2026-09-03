# CityPass+ Frontend

Aplicacion React para consultar eventos, reservar lugares y administrar la agenda cultural.

## Instalacion

```bash
npm install
cp .env.example .env
npm run dev
```

El archivo `.env` debe contener la direccion del backend:

```env
VITE_API_URL="http://localhost:3000"
```

La aplicacion queda disponible en `http://localhost:5173`.

El backend debe estar ejecutandose en otra terminal para poder iniciar sesion, consultar eventos, guardar reservas y subir imagenes.

## Usuarios de prueba

| Perfil | Usuario | Contrasena |
| --- | --- | --- |
| Ciudadano | `ciudadano` | `1234` |
| Administrador | `admin` | `1234` |

## Verificacion

```bash
npm run lint
npm run build
```

El frontend no necesita la contrasena de PostgreSQL ni la secret key de Supabase. Esas credenciales pertenecen solamente al backend.
