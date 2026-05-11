import express from "express";
import axios from "axios";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
const app = express();
// const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseKey);

// 连连支付配置
const LL_MERCHANT_ID = process.env.LL_MERCHANT_ID || "";
const LL_PRIVATE_KEY = process.env.LL_PRIVATE_KEY || "";
const LL_PUBLIC_KEY = process.env.LL_PUBLIC_KEY || "";

// 连连支付手动签名工具函数
function sortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  }
  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    if (obj[key] !== null) {
      sorted[key] = sortObject(obj[key]);
    }
  });
  return sorted;
}

function buildSignString(obj: any): string {
  const sortedObj = sortObject(obj);
  const parts: string[] = [];
  for (const key in sortedObj) {
    let value = sortedObj[key];
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    }
    parts.push(`${key}=${value}`);
  }
  return parts.join('&');
}

function generateLianLianSignature(data: any, privateKey: string): string {
  const signString = buildSignString(data);
  console.log("待签名字符串:", signString);
  
  // 格式化私钥（确保有头尾）
  let formattedKey = privateKey;
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  const signer = crypto.createSign('RSA-SHA1');
  signer.update(signString);
  return signer.sign(formattedKey, 'base64');
}

function verifyLianLianSignature(data: any, signature: string, publicKey: string): boolean {
  const signString = buildSignString(data);
  
  // 格式化公钥
  let formattedKey = publicKey;
  if (!formattedKey.includes('-----BEGIN PUBLIC KEY-----')) {
    formattedKey = `-----BEGIN PUBLIC KEY-----\n${formattedKey.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  const verifier = crypto.createVerify('RSA-SHA1');
  verifier.update(signString);
  return verifier.verify(formattedKey, signature, 'base64');
}

console.log(`连连支付配置状态: ${LL_MERCHANT_ID ? '已配置' : '未配置'}`);

app.use(express.json());
app.use(express.static("public"));

// 2. 跨域放行
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// 连连支付接口：创建支付订单
app.post("/api/lianlian/pay", async (req, res) => {
  if (!LL_MERCHANT_ID || !LL_PRIVATE_KEY) {
    return res.status(500).json({ error: "连连支付配置缺失" });
  }

  try {
    const { amount, currency, description } = req.body;
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
                      (now.getMonth() + 1).toString().padStart(2, '0') + 
                      now.getDate().toString().padStart(2, '0') + 
                      now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0') + 
                      now.getSeconds().toString().padStart(2, '0');
    
    const orderId = `LL${timestamp}${Math.floor(Math.random() * 10000)}`;

    const body = {
      merchant_order_id: orderId,
      merchant_order_time: timestamp,
      order_amount: amount || "129.00",
      order_currency: currency || "USD",
      notification_url: `${process.env.APP_URL || 'https://selindell.com'}/api/lianlian/notify`,
      redirect_url: `${process.env.APP_URL || 'https://selindell.com'}/success`,
      product_info: description || "Selindell AI Custom Design",
      payment_method: "CREDIT_CARD",
    };

    const signature = generateLianLianSignature(body, LL_PRIVATE_KEY);
    
    const headers = {
      'Content-Type': 'application/json',
      'signature': signature,
      'timestamp': timestamp,
      'timezone': 'Asia/Hong_Kong'
    };

    // 连连支付收银台接口（沙箱/生产通过环境变量切换）
    const LL_BASE = process.env.LL_ENV === 'production'
      ? 'https://gpapi.lianlianpay-inc.com'
      : 'https://celer-api.lianlianpay-inc.com';
    const apiUrl = `${LL_BASE}/v3/merchants/${LL_MERCHANT_ID}/payments`;
    
    console.log("正在向连连发起支付请求:", apiUrl);
    console.log("请求头:", JSON.stringify(headers));
    console.log("请求体:", JSON.stringify(body));

    const response = await axios.post(apiUrl, body, { headers });
    
    console.log("连连支付响应成功:", JSON.stringify(response.data));
    res.json({ ...response.data, orderId });

  } catch (error: any) {
    const errorDetail = error.response?.data || error.message;
    console.error("连连支付请求失败:", JSON.stringify(errorDetail, null, 2));
    res.status(500).json({ 
      error: "连连支付创单失败", 
      details: errorDetail 
    });
  }
});

// 连连支付接口：异步通知
// 连联文档：支付状态="PS"时触发，必须返回固定报文否则会重试
app.post("/api/lianlian/notify", express.text({ type: '*/*' }), (req, res) => {
  try {
    // 连联通知必须返回纯文本固定报文
    const sendSuccess = () => res.status(200).type('text/plain').send('{"response_code":"SUCCESS"}');
    const sendFail = (msg: string) => res.status(200).type('text/plain').send(`{"response_code":"FAIL","response_message":"${msg}"}`);

    const signature = (req.headers['signature'] || req.headers['sign']) as string;
    if (!signature) {
      console.error("连联通知缺少签名头");
      return sendFail("missing signature");
    }

    // 解析 body（可能是字符串或对象）
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return sendFail("invalid json"); }
    }

    console.log("连联支付通知原始数据:", JSON.stringify(body));

    // 验签
    const isValid = verifyLianLianSignature(body, signature, LL_PUBLIC_KEY);
    if (!isValid) {
      console.error("连联通知验签失败，签名:", signature);
      return sendFail("invalid signature");
    }

    // 只处理支付成功状态 PS
    const paymentStatus = body.payment_status || body.status;
    if (paymentStatus === 'PS') {
      const merchantOrderId = body.merchant_order_id || body.business_order_id;
      console.log(`订单支付成功: ${merchantOrderId}`);
      // TODO: 更新 Supabase 订单状态为 paid
      // await supabase.from('orders').update({ status: 'paid' }).eq('order_id', merchantOrderId);
    } else {
      console.log(`收到通知，支付状态: ${paymentStatus}，暂不处理`);
    }

    // 必须返回这个固定报文，否则连联会持续重试
    return sendSuccess();

  } catch (error: any) {
    console.error("处理连联通知异常:", error.message);
    // 即使出错也要返回固定格式，避免无限重试
    return res.status(200).type('text/plain').send('{"response_code":"FAIL","response_message":"internal error"}');
  }
});

// Whop Webhook 接口
app.post("/api/whop-webhook", express.json(), async (req, res) => {
  try {
    const payload = req.body;
    console.log("收到 Whop Webhook:", JSON.stringify(payload));

    // Whop webhook payload 结构通常包含 action 和 data
    // 我们监听 invoice_paid 或 payment_succeeded
    const action = payload.action || payload.type;
    
    if (action === 'invoice_paid' || action === 'payment_succeeded' || action === 'membership_activated') {
      // 尝试从 payload 中获取用户邮箱
      const email = payload.data?.email || payload.data?.customer?.email || payload.data?.user?.email;
      
      if (email) {
        console.log(`Whop 支付成功，匹配邮箱: ${email}`);
        
        // 查找该邮箱最近的一个 pending 订单
        // const { data: orders, error: fetchError } = await supabase
        //   .from('orders')
        //   .select('id')
        //   .eq('guest_email', email)
        //   .eq('status', 'pending')
        //   .order('created_at', { ascending: false })
        //   .limit(1);

        // if (fetchError) {
        //   console.error("查询订单失败:", fetchError);
        // } else if (orders && orders.length > 0) {
        //   const orderId = orders[0].id;
        //   // 更新订单状态为 paid
        //   const { error: updateError } = await supabase
        //     .from('orders')
        //     .update({ status: 'paid' })
        //     .eq('id', orderId);
            
        //   if (updateError) {
        //     console.error(`更新订单 ${orderId} 状态失败:`, updateError);
        //   } else {
        //     console.log(`成功将订单 ${orderId} 状态更新为 paid`);
        //   }
        // } else {
        //   console.log(`未找到邮箱 ${email} 对应的 pending 订单`);
        // }
      } else {
        console.log("Webhook payload 中未找到邮箱信息");
      }
    }

    res.status(200).send("OK");
  } catch (error: any) {
    console.error("处理 Whop Webhook 异常:", error.message);
    res.status(500).send("Internal Server Error");
  }
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