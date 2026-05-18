import { VercelRequest, VercelResponse } from '@vercel/node';

// 注意：由于 Serverless 是无状态的，实际生产环境中这里应该连接数据库来更新订单状态，
// 这里暂时使用打印日志，表示 Webhook 工作正常。
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ec: 405, em: "Method Not Allowed" });
  }

  try {
    console.log("Received Aifadian Webhook:", req.body);
    const { data } = req.body || {};
    
    if (data && data.type === "order" && data.order) {
      const orderId = data.order.out_trade_no;
      console.log(`Order ${orderId} marked as PAID via Webhook`);
      // TODO: 更新数据库中该订单的支付状态
    }
    
    // 必须返回 {"ec":200}
    res.status(200).json({ ec: 200, em: "" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(200).json({ ec: 200, em: "" });
  }
}
