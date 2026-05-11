"use client";

import { useState } from "react";

export default function PayButton() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handlePayment = async () => {
    setErrorMsg("");
    
    const email = window.prompt("请输入您的邮箱地址以接收订单信息：");
    if (!email) {
      return; // 用户取消输入
    }

    // 简单校验邮箱格式
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg("请输入有效的邮箱地址");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "支付请求失败");
      }

      if (data.payUrl) {
        // 跳转到连连支付页面
        window.location.href = data.payUrl;
      } else {
        throw new Error("未获取到支付链接");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setErrorMsg(error.message || "发生未知错误，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition-all ${
          isProcessing 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {isProcessing ? "处理中..." : "立即购买 $129"}
      </button>
      
      {errorMsg && (
        <p className="text-red-500 text-sm">{errorMsg}</p>
      )}
    </div>
  );
}
