import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://api.voisk.cloud',
        changeOrigin: true,
        // api.voisk.cloud 인증서가 2026-08-21에 만료돼 Node가 연결을 거부한다.
        // 개발 서버에서만 검증을 건너뛴다. 배포는 vercel.json의 rewrite를 쓰므로
        // 이 설정과 무관하다. 인증서가 갱신되면 지울 것.
        secure: false,
        headers: {
          Origin: 'https://api.voisk.cloud',
        },
      },
    },
  },
})
