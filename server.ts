import express from "express";
import axios from "axios";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
const app = express();
// const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static("public"));

// 2. 跨域放行
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 6. 本地开发与 Vercel Serverless 兼容逻辑
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Local server running on port ${PORT}`);
    });
  } else {
    app.use(express.static("dist"));
    app.get("*all", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }
}

startServer();

export default app;