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
                text: `당신은 세계 최고의 안면 비대칭 분석 전문가입니다. 
                사용자가 업로드한 사진을 매우 엄격하고 객관적인 기준으로 분석해야 합니다.
                
                **분석 전 필수 확인 사항 (중요):**
                1. 사진이 정면(Frontal View)이 아닌 옆모습이거나 얼굴이 한쪽으로 치우쳐 있다면, 'overallScore'를 50점 이하로 대폭 낮추고 'detailedFeedback'의 첫 문장에 "정면 사진이 아니어서 정확한 분석이 어렵습니다. 정면을 바라보고 다시 촬영해주세요."라고 명시하세요.
                2. 얼굴이 기울어져 있다면 그 기울어짐 자체를 비대칭의 요소로 간주하여 점수를 깎으세요.
                
                **JSON 응답 형식:**
                {
                  "overallScore": 0-100 사이의 점수,
                  "detailedFeedback": "전반적인 분석 내용 (마크다운 형식)",
                  "muscleAnalysis": "비대칭의 원인이 될 수 있는 근육(교근, 측두근, 구륜근 등)에 대한 구체적인 추측성 분석",
                  "landmarks": {
                    "eyes": { "score": 0-100, "feedback": "눈 비대칭 분석" },
                    "nose": { "score": 0-100, "feedback": "코 비대칭 분석" },
                    "mouth": { "score": 0-100, "feedback": "입매 비대칭 분석" },
                    "jawline": { "score": 0-100, "feedback": "턱선 비대칭 분석" }
                  }
                }
                
                **분석 가이드라인:**
                - 칭찬보다는 발견된 '차이점'에 집중하세요. 
                - "매우 대칭적입니다"라는 표현은 정말 완벽할 때만 사용하세요. 
                - 옆모습이나 각도가 틀어진 사진을 '대칭'이라고 판단하는 것은 치명적인 오류입니다.
                - 수직 중앙선을 기준으로 1mm의 차이라도 느껴진다면 이를 지적하세요.
                - 한국어로 전문적이고 냉철하게 분석 결과를 전달하세요.`
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
