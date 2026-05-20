import { VercelRequest, VercelResponse } from '@vercel/node';
import { updateDoc, doc, db } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ec: 405, em: "Method Not Allowed" });
  }

  try {
    console.log("Received Aifadian Webhook:", req.body);
    const { data } = req.body || {};
    
    if (data && data.type === "order" && data.order) {
      const orderId = data.order.out_trade_no;
      console.log(`Order ${orderId} marked as PAID via Webhook`);
      
      try {
        await updateDoc(doc(db, 'orders', orderId), { status: 'paid', updated_at: new Date().toISOString() });
        console.log(`Updated order ${orderId} to paid`);
      } catch (dbErr) {
        console.error("Failed to update order:", dbErr);
      }
    }
    
    // 必须返回 {"ec":200}
    res.status(200).json({ ec: 200, em: "" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(200).json({ ec: 200, em: "" });
  }
}

