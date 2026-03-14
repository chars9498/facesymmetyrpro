import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // JSON 바디 파서
  app.use(express.json({ limit: '10mb' }));

  // 요청 로깅
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // 단순 메모리 기반 사용량 제한 (IP당 하루 5회)
  // 실제 서비스에서는 Redis나 DB를 사용하는 것이 좋습니다.
  const usageStore: Record<string, { count: number; lastReset: number }> = {};

  const checkRateLimit = (ip: string) => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!usageStore[ip]) {
      usageStore[ip] = { count: 0, lastReset: now };
    }

    // 24시간이 지났으면 초기화
    if (now - usageStore[ip].lastReset > oneDay) {
      usageStore[ip] = { count: 0, lastReset: now };
    }

    if (usageStore[ip].count >= 100) {
      return false;
    }

    usageStore[ip].count++;
    return true;
  };

  // AI 분석 API 엔드포인트
  app.post("/api/analyze", async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipKey = String(clientIp);

    // 1. 사용량 제한 확인
    if (!checkRateLimit(ipKey)) {
      return res.status(429).json({ 
        error: "분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요. (테스트용 한도 100회)" 
      });
    }

    const { metrics, prompt } = req.body;

    try {
      // 1. Get API Key
      const getValidKey = () => {
        const keys = [process.env.REAL_KEY, process.env.GEMINI_API_KEY, process.env.API_KEY];
        for (const key of keys) {
          if (!key) continue;
          const trimmed = key.trim();
          const isPlaceholder = trimmed.includes('YOUR_') || trimmed.includes('MY_') || trimmed === 'GEMINI_API_KEY' || trimmed === 'undefined';
          if (trimmed.length >= 10 && !isPlaceholder) {
            return trimmed;
          }
        }
        return null;
      };

      const apiKey = getValidKey();

      if (!apiKey) {
        return res.status(500).json({ 
          error: "서버 설정 오류: 유효한 API 키를 찾을 수 없습니다."
        });
      }

      // Retry logic with exponential backoff and fallback model
      const generateWithRetry = async (maxRetries = 8) => {
        let lastError;
        // List of models to try in order of preference
        const models = ["gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"];
        
        for (let i = 0; i < maxRetries; i++) {
          // Switch to fallback model after 2 failed attempts
          const modelIndex = i >= 2 ? 1 : 0;
          const currentModel = models[modelIndex];
          
          try {
            // Create a new GoogleGenAI instance right before making an API call
            // to ensure it always uses the most up-to-date API key and state
            const ai = new GoogleGenAI({ apiKey });
            
            const response = await ai.models.generateContent({
              model: currentModel,
              contents: [
                {
                  parts: [
                    { text: prompt }
                  ],
                },
              ],
              config: {
                responseMimeType: "application/json"
              }
            });
            return response;
          } catch (error: any) {
            lastError = error;
            
            // Extract status code and message
            const errorStr = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
            const statusCode = error.status || (errorStr.includes('503') ? 503 : errorStr.includes('429') ? 429 : errorStr.includes('500') ? 500 : 0);
            
            // Retry on 429 (Rate limit), 503 (High demand) or 500 (Internal error)
            const isRetryable = statusCode === 429 || statusCode === 503 || statusCode === 500;
            
            if (isRetryable && i < maxRetries - 1) {
              // More aggressive exponential backoff for persistent errors: 2s, 4s, 8s, 16s, 32s...
              const delay = Math.pow(2, i + 1) * 1000 + Math.random() * 1000;
              const nextModel = (i + 1 >= 2) ? models[1] : models[0];
              console.log(`[Retry ${i + 1}/${maxRetries}] Status ${statusCode} on ${currentModel}. Switching to ${nextModel} in ${Math.round(delay)}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
        }
        throw lastError;
      };

      const response = await generateWithRetry();

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ 
        error: "분석 중 오류가 발생했습니다.",
        details: error.message
      });
    }
  });

  // Vite 미들웨어 (개발 환경)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // 프로덕션 환경에서는 정적 파일 서빙
    const distPath = path.join(__dirname, "dist");
    
    // PWA 관련 파일들에 대해 명시적 라우팅 (Vercel 등에서 정적 파일 서빙 이슈 방지)
    app.get("/manifest.webmanifest", (req, res) => {
      res.setHeader("Content-Type", "application/manifest+json");
      res.sendFile(path.join(distPath, "manifest.webmanifest"));
    });
    
    app.get("/sw.js", (req, res) => {
      res.setHeader("Service-Worker-Allowed", "/");
      res.sendFile(path.join(distPath, "sw.js"));
    });

    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 글로벌 에러 핸들러 (HTML 대신 JSON 반환)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    res.status(err.status || 500).json({ 
      error: "서버 내부 오류가 발생했습니다.", 
      details: err.message 
    });
  });

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
