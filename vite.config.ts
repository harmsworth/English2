import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

/**
 * 部署基路径。GitHub Pages 的「项目站点」挂在 https://<user>.github.io/<repo>/ 子路径下，
 * 必须让打包产物里的资源 URL 带上这个前缀，否则 /assets/* 会打到域名根路径、全部 404（页面白屏）。
 * 本地 dev / build 不设该变量 ⇒ 回落 '/'，行为与以前完全一致；
 * 只有 CI（deploy.yml）注入 DEPLOY_BASE=/English2/。
 */
const base = process.env.DEPLOY_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
