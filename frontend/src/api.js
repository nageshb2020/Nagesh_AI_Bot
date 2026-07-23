// In development: Vite proxies /api/* → localhost:8000 (see vite.config.js)
// In production (Vercel): set VITE_API_BASE_URL to your Render backend URL
//   e.g. https://nagesh-recruiter-bot-api.onrender.com
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''
