import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAccessibility } from './hooks/useAccessibility'

// 저장된 고대비/큰 글자 설정을 첫 렌더 전에 <html>에 반영한다.
// 렌더 후에 하면 기본 화면이 한 번 그려졌다가 바뀌어 화면이 번쩍인다.
initAccessibility()

createRoot(document.getElementById('root')!).render(
    <App />
)
