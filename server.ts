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

    if (usageStore[ip].count >= 5) {
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
        error: "오늘 사용량을 모두 소진했습니다. (하루 최대 5회) 내일 다시 시도해주세요." 
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

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
