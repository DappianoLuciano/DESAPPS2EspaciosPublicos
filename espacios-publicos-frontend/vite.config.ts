import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const apiUrl = loadEnv(mode, process.cwd(), '').VITE_API_URL?.trim()

    if (!apiUrl) {
      throw new Error('VITE_API_URL es obligatoria para compilar el frontend de producción.')
    }

    let parsedApiUrl: URL

    try {
      parsedApiUrl = new URL(apiUrl)
    } catch {
      throw new Error('VITE_API_URL debe ser una URL válida.')
    }

    if (parsedApiUrl.protocol !== 'https:') {
      throw new Error('VITE_API_URL debe utilizar HTTPS para compilar producción.')
    }

    if (parsedApiUrl.username || parsedApiUrl.password) {
      throw new Error('VITE_API_URL no debe contener credenciales.')
    }

    if (parsedApiUrl.search || parsedApiUrl.hash || parsedApiUrl.pathname !== '/') {
      throw new Error('VITE_API_URL debe contener solamente el origen del backend.')
    }
  }

  return {
    plugins: [react()],
  }
})
