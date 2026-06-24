import express from "express";
import axios from "axios";
import path from "path";
import crypto from "crypto";
import fetch from "cross-fetch";

const app = express();

// 1. 跨域放行 (Move to very top)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("public"));

import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary globally
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 1. Image upload via direct Cloudinary signed upload
app.post("/api/upload", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: "Cloudinary is not configured" });
    }

    const uploadRes = await cloudinary.uploader.upload(image, {
      folder: "selindell_creations",
    });

    return res.json({ url: uploadRes.secure_url });
  } catch (error: any) {
    console.error("Cloudinary upload proxy error:", error);
    res.status(500).json({ error: error.message || "Failed to upload to Cloudinary" });
  }
});

// Proxy route for Ark Chat API (Securely hide API Key on the server)
app.post("/api/ark-completions", async (req, res) => {
  const apiKey = process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "未配置 ARK API Key" } });
  }

  try {
    const model = req.body?.model || "ep-20250225134706-f7rjw";
    console.log(`[Ark Chat completions] Using model EP: ${model}`);

    const arkRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body || {})
    });

    const data = await arkRes.json();
    if (!arkRes.ok) {
      console.error(`[Ark Chat] Error response for model ${req.body.model}:`, JSON.stringify(data));
      return res.status(arkRes.status).json(data);
    }
    return res.json(data);
  } catch (error: any) {
    console.error("Ark API Error:", error);
    res.status(500).json({ error: { message: error.message || "Failed to call Ark API" } });
  }
});

// Proxy route for Ark Image Generation API
app.post("/api/ark-images-generations", async (req, res) => {
  const apiKey = process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "未配置 ARK API Key" } });
  }

  try {
    const model = req.body?.model || "ep-20250225134706-f7rjw";
    console.log(`[Ark Image Generation] Using model EP: ${model}`);

    const arkRes = await fetch("https://ark.cn-beijing.volces.com/api/v3/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body || {})
    });

    const data = await arkRes.json();
    if (!arkRes.ok) {
      console.error(`[Ark Image] Error response for model ${req.body.model}:`, JSON.stringify(data));
      return res.status(arkRes.status).json(data);
    }
    return res.json(data);
  } catch (error: any) {
    console.error("Ark Image API Error:", error);
    res.status(500).json({ error: { message: error.message || "Failed to call Ark API" } });
  }
});

// 7. 爱发电 (Aifadian) 支付逻辑
const AIFADIAN_USER_ID = process.env.AIFADIAN_USER_ID;
const AIFADIAN_TOKEN = process.env.AIFADIAN_TOKEN;

// 简单的内存订单追踪 (生产环境应使用数据库)
const orders: Record<string, { email: string; status: string; amount: number }> = {};

function getAifadianSign(params: string, ts: number) {
  const token = AIFADIAN_TOKEN || "";
  const userId = AIFADIAN_USER_ID || "";
  const signStr = `${token}params${params}ts${ts}user_id${userId}`;
  return crypto.createHash("md5").update(signStr).digest("hex");
}

app.post("/api/checkout", (req, res) => {
  try {
    const { email, amount = 299, orderId } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const finalOrderId = orderId || `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 记录订单 (Local variable fallback, better to rely on Firebase/Webhook)
    orders[finalOrderId] = { email, amount, status: "pending" };

    if (!AIFADIAN_USER_ID) {
      return res.status(500).json({ error: "Aifadian not configured" });
    }

    // 爱发电下单页链接
    const payUrl = `https://afdian.net/order/create?user_id=${AIFADIAN_USER_ID}&custom_order_id=${finalOrderId}&remark=${encodeURIComponent(email)}&custom_price=${amount}`;

    res.json({ payUrl, orderId: finalOrderId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 接收爱发电的 Webhook 通知
app.post("/api/webhook/aifadian", async (req, res) => {
  console.log("Received Aifadian Webhook:", req.body);
  const { data } = req.body || {};
  
  if (data && data.type === "order" && data.order) {
    const orderId = data.order.out_trade_no;
    if (orders[orderId]) {
      orders[orderId].status = "paid";
    }
    console.log(`Order ${orderId} marked as PAID via Webhook`);
    // Optional: Firebase update if we run locally
  }
  
  // 必须返回 {"ec":200}
  res.json({ ec: 200, em: "ok" });
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    // 先查本地缓存
    if (orders[orderId]?.status === "paid") {
      return res.json({ status: "paid" });
    }

    // 如果本地还没更新，主动去爱发电查一次
    if (!AIFADIAN_USER_ID || !AIFADIAN_TOKEN) {
      return res.json({ status: "pending" });
    }

    const ts = Math.floor(Date.now() / 1000);
    const params = JSON.stringify({ out_trade_no: orderId });
    const sign = getAifadianSign(params, ts);

    const response = await axios.post("https://afdian.net/api/open/query-order", {
      user_id: AIFADIAN_USER_ID,
      ts,
      params,
      sign
    });

    const data = response.data;
    if (data.ec === 200 && data.data.list && data.data.list.length > 0) {
      // 订单存在且已支付
      // 注意：爱发电接口返回的数据结构请参考其官方文档
      res.json({ status: "paid", order: data.data.list[0] });
    } else {
      res.json({ status: "pending" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. 本地开发与 Vercel Serverless 兼容逻辑
async function startServer() {
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
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
      
      const PORT = Number(process.env.PORT) || 3000;
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Production server running on port ${PORT}`);
      });
    }
  }
}

startServer();

export default app;