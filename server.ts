import express from "express";
import axios from "axios";
import path from "path";
import crypto from "crypto";

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
    const { email, amount = 129 } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // 记录订单
    orders[orderId] = { email, amount, status: "pending" };

    if (!AIFADIAN_USER_ID) {
      return res.status(500).json({ error: "Aifadian not configured" });
    }

    // 爱发电下单页链接
    const payUrl = `https://afdian.net/order/create?user_id=${AIFADIAN_USER_ID}&custom_order_id=${orderId}&remark=${encodeURIComponent(email)}&custom_price=${amount}`;

    res.json({ payUrl, orderId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 接收爱发电的 Webhook 通知
app.post("/api/webhook/aifadian", (req, res) => {
  console.log("Received Aifadian Webhook:", req.body);
  const { data } = req.body || {};
  
  if (data && data.type === "order" && data.order) {
    const orderId = data.order.out_trade_no;
    if (orders[orderId]) {
      orders[orderId].status = "paid";
      console.log(`Order ${orderId} marked as PAID via Webhook`);
    }
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