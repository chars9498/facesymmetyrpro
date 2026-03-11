import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser for base64 images
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                text: `당신은 전문적인 안면 비대칭 분석 전문가입니다. 
                제공된 얼굴 사진을 분석하여 비대칭 정도를 평가해주세요.
                
                다음 JSON 형식으로 응답해주세요:
                {
                  "overallScore": 0-100 사이의 대칭 점수 (100이 완벽한 대칭),
                  "detailedFeedback": "전반적인 분석 내용 (마크다운 형식)",
                  "landmarks": {
                    "eyes": "눈의 비대칭 분석",
                    "nose": "코의 비대칭 분석",
                    "mouth": "입술 및 입매 비대칭 분석",
                    "jawline": "턱선 및 얼굴형 비대칭 분석"
                  }
                }
                
                분석 시 주의사항:
                1. 정중앙 수직선을 기준으로 왼쪽과 오른쪽의 차이를 구체적으로 설명하세요.
                2. 눈의 높낮이, 크기 차이, 눈썹 위치 등을 확인하세요.
                3. 콧대의 휘어짐이나 콧볼의 비대칭을 확인하세요.
                4. 입꼬리의 높낮이 차이를 확인하세요.
                5. 턱선의 각도나 근육 발달 차이를 확인하세요.
                6. 한국어로 친절하고 전문적으로 설명하세요.`
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: image
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response from AI");
      }

      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode serving static files");
    const distPath = path.join(__dirname, "dist");
    
    // Check if dist exists
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get("*", (req, res) => {
      console.log(`Fallback routing for: ${req.url}`);
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          console.error("Error sending index.html:", err);
          res.status(404).send("Application is still building or dist/index.html is missing. Please try again in a minute.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
