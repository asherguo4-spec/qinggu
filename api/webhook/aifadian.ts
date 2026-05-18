import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

// 动态导入配置以避免绝对路径问题或先尝试从环境变量获取
let app: any;
let db: any;
try {
  const firebaseConfig = require('../../firebase-applet-config.json');
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.log("Failed to init firebase in webhook", e);
}

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
      
      if (db) {
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: 'paid', updated_at: new Date().toISOString() });
          console.log(`Updated Firebase order ${orderId} to paid`);
        } catch (dbErr) {
          console.error("Failed to update Firebase order:", dbErr);
        }
      }
    }
    
    // 必须返回 {"ec":200}
    res.status(200).json({ ec: 200, em: "" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(200).json({ ec: 200, em: "" });
  }
}
