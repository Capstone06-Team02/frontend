import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './index.css'; 



// createRoot(document.getElementById('root')!).render(
//   <StrictMode>  <-- 이 줄과 아래 줄 주석 처리
//     <App />
//   </StrictMode>,
// )

createRoot(document.getElementById('root')!).render(
    <App />
)
