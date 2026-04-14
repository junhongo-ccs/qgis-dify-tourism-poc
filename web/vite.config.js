import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const useGitHubPages = process.env.GITHUB_PAGES === 'true'

  return {
    base: useGitHubPages ? '/qgis-dify-tourism-poc/' : '/',
    plugins: [react()],
  }
})
