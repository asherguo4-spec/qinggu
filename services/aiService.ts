
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export class SelindellAIService {
  private async callOpenRouter(model: string, messages: any[], responseFormat?: any, signal?: AbortSignal) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("未配置 OpenRouter API Key");

    const body: any = {
      model,
      messages
    };
    
    if (responseFormat) {
      body.response_format = responseFormat;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000",
        "X-Title": "Selindell Forge"
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `请求失败 (${response.status})`);
    }

    return await response.json();
  }

  private cleanJsonResponse(content: string): string {
    if (!content) return "";
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    }
    return cleaned;
  }

  async checkCopyright(prompt: string, lang: string, signal?: AbortSignal): Promise<{ status: 'pass' | 'reject', reason?: string, suggestion?: string }> {
    return { status: "pass" };
  }

  async analyzeReferenceImage(base64Image: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
    try {
      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `请仔细分析这张图像，提取其中的核心主体（不仅限于人物，可能是任何物体，如物品、动物、汽车、建筑等）。如果用户的指令指定了生成某特定物体（比如“只做旁边的摩托车”），请严格遵照用户指令提取。提取其外形、颜色等核心特征并忽略背景。将这些特征转化为段简明准确的描述，用于后续生成树脂材质实体潮玩手办。用户的具体要求是：${userPrompt}。如果未提供额外要求，请仅提取主要事物。请用中文回答，字数控制在50字以内。`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ];
      const data = await this.callOpenRouter("qwen/qwen-vl-plus", messages, undefined, signal);
      return data.choices[0].message.content.trim();
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Image analysis error:", e);
      return userPrompt || "A character";
    }
  }

  async expandPrompt(prompt: string, signal?: AbortSignal): Promise<string> {
    try {
      const data = await this.callOpenRouter(
        "qwen/qwen-plus",
        [{ role: "user", content: `你是一位手办设计师。请将 “${prompt}” 扩写成 50 字的手办描述。只返回纯中文，不要解释。` }],
        undefined,
        signal
      );
      return data.choices[0].message.content.trim() || prompt;
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Expand prompt error:", e);
      throw new Error("扩写灵感失败，请稍后重试"); 
    }
  }

  async generateShortTitle(prompt: string, base64Image?: string | null, signal?: AbortSignal, lang?: string): Promise<string> {
    let description = prompt;
    if (base64Image && (prompt.length < 10 || prompt.includes("图片") || prompt.includes("image"))) {
      description = await this.analyzeReferenceImage(base64Image, prompt, signal);
    }
    
    // Choose prompt based on language
    let promptContent = `请将 “${description}” 缩减为一个 4 到 5 个字的标题。只返回标题内容，不要任何其他文字。`;
    let maxLength = 5;
    
    try {
      const data = await this.callOpenRouter(
        "qwen/qwen-plus",
        [{ role: "user", content: promptContent }],
        undefined,
        signal
      );
      const generated = data.choices[0].message.content.trim();
      return generated.substring(0, maxLength) || description.substring(0, maxLength);
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Short title generation error:", e);
      return description.substring(0, maxLength);
    }
  }

  async generate360Creation(prompt: string, styleSuffix: string, base64Image?: string | null, signal?: AbortSignal): Promise<string[]> {
    let coreSubject = prompt;
    if (base64Image) {
      coreSubject = await this.analyzeReferenceImage(base64Image, prompt, signal);
    }

    const finalPrompt = `白色背景，实物潮玩手办。
主体内容：${coreSubject}。
整体风格：${styleSuffix}。
材质要求：必须为树脂材质。
设计要求：造型需适度写实但必须结构简单、紧凑，避免悬空过大或极度纤细的易断部件，确保低成本3D打印（控制在200元以内复杂度的打印成本）。
底座要求：主体必须站在一个极简底座上。左侧前视图的底座必须清晰写有“selindell”字样，右侧后视图的底座无“selindell”字样。
构图与视角：图像必须侧对侧首尾并排展示两个同一手办的完整3D渲染图——左侧为3D前视图，右侧为3D后视图。
画面渲染：两视图均需全彩、写实3D，具备真实的物理世界树脂反光和摄影棚级布光。严禁2D插图、漫画线稿、平面草图或设计蓝图，必须看起来像真实摆放的手办商品照，且必须符合物理生产规律。`;

    let contentArray: any[] = [
      {
        type: "text",
        text: finalPrompt
      }
    ];

    if (base64Image) {
      contentArray.push({
        type: "image_url",
        image_url: {
          url: base64Image
        }
      });
    }

    try {
      const data = await this.callOpenRouter(
        "seedream-4.5",
        [{ 
          role: "user", 
          content: contentArray
        }],
        undefined,
        signal
      );

      if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter 未返回任何选项 (choices)");
      }

      const message = data.choices[0].message;
      const images: string[] = [];

      // 【最关键的一步】OpenRouter 的图片生成专用字段
      if (message.images && Array.isArray(message.images)) {
        for (const img of message.images) {
          const url = typeof img === 'string' ? img : (img.url || img.image_url?.url);
          if (url) images.push(url);
        }
      }

      // 【兜底逻辑 1】如果上面的没找到，再看 content 是否直接就是 URL
      const content = message.content?.trim() || "";
      if (images.length === 0 && content.startsWith("http")) {
        images.push(content);
      }

      // 【兜底逻辑 2】如果是 Base64 文本
      if (images.length === 0 && content.includes("data:image")) {
        const match = content.match(/data:image\/[^;]+;base64,[^"'\s)]+/);
        if (match) images.push(match[0]);
      }
      
      // 【兜底逻辑 3】检查 OpenRouter 的其他可能结构
      if (images.length === 0) {
        const parts = message.parts || message.content_parts || [];
        if (Array.isArray(parts)) {
          for (const part of parts) {
            if (part.image_url) images.push(part.image_url.url || part.image_url);
            if (part.inline_data) images.push(`data:${part.inline_data.mime_type};base64,${part.inline_data.data}`);
          }
        }
      }

      // 如果还是空，报错并打印出 AI 到底回了什么
      if (images.length === 0) {
        console.log("OpenRouter 完整回复对象:", JSON.stringify(data, null, 2));
        throw new Error(`AI 未返回图像。AI 文本内容: "${content.substring(0, 50)}..."`);
      }

      return images;
    } catch (error: any) {
      if (error.name !== 'AbortError' && !(error.message && error.message.toLowerCase().includes('abort'))) {
        console.error("Image generation error:", error);
      }
      throw new Error(error.message || "造物引擎暂时无法响应");
    }
  }

  async generateLoreAndStats(prompt: string, signal?: AbortSignal) {
    try {
      const data = await this.callOpenRouter(
        "qwen/qwen-plus",
        [{ role: "user", content: `你是一个剧本策划。请基于描述 “${prompt}”，生成这个造物的手办名称、一段30字以内的引人入胜的背景故事、以及战斗属性。
        必须以 JSON 格式返回，包含以下字段：
        - title: 字符串，名称
        - lore: 字符串，故事
        - stats: 对象，包含 power (1-100), agility (1-100), soul (1-100), rarity (字符串 "N"|"R"|"SR"|"SSR")
        只返回合法的 JSON 字符串，不要包含 markdown 标记。` }],
        { type: "json_object" },
        signal
      );
      
      const content = data.choices[0].message.content;
      return JSON.parse(this.cleanJsonResponse(content) || "{}");
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Lore generation error:", e);
      return { title: "未命名造物", lore: "来自异次元的灵感碎片。", stats: { power: 80, agility: 80, soul: 80, rarity: "R" } };
    }
  }

  async generateStoryCard(prompt: string, style: string, lang: string, signal?: AbortSignal): Promise<string> {
    const targetLang = '简体中文';

    try {
      const data = await this.callOpenRouter(
        "qwen/qwen-plus",
        [{ 
          role: "user", 
          content: `你是一位顶尖的 IP 策划。请根据以下描述：“${prompt}” 和风格：“${style}”，将这个造物定义为一个独特的 IP 角色，并为其撰写一段 50 字左右的 ${targetLang} 背景故事介绍。要求文字优美、引人入胜，赋予其生命力。只返回故事内容，不要任何其他文字。` 
        }],
        undefined,
        signal
      );
      return data.choices[0].message.content.trim() || "来自异次元的灵感碎片，承载着造物主的奇思妙想。";
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Story card generation error:", e);
      return "来自异次元的灵感碎片，承载着造物主的奇思妙想。";
    }
  }

  /**
   * Logo 生成逻辑 (用于 LogoGenerator.tsx)
   */
  async generateLogo(base64Image: string, stylePrompt: string, signal?: AbortSignal): Promise<string> {
    try {
      // 虽然用户要求全换成 Qwen3.5 Plus，但 Qwen 本身不具备图片生成能力（只具备分析能力）。
      // 在国内上线的合规替代方案中，Seedream 4.5 是目前该应用中已配置且支持图生图的国产模型。
      // 如果 Qwen3.5 Plus 后续支持图生图输出，可在此更换。
      const data = await this.callOpenRouter(
        "seedream-4.5",
        [{ 
          role: "user", 
          content: [
            {
              type: "text",
              text: stylePrompt
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ] 
        }],
        undefined,
        signal
      );

      if (!data.choices || data.choices.length === 0) {
        throw new Error("OpenRouter 未返回任何内容");
      }

      const message = data.choices[0].message;
      let imageUrl = "";

      if (message.images && message.images[0]) {
        imageUrl = typeof message.images[0] === 'string' ? message.images[0] : (message.images[0].url || message.images[0].image_url?.url);
      } else if (message.content?.startsWith("http")) {
        imageUrl = message.content.trim();
      } else {
        // 检查各种可能的 OpenRouter 结构
        const parts = message.parts || message.content_parts || [];
        for (const part of parts) {
          if (part.image_url) {
            imageUrl = part.image_url.url || part.image_url;
            break;
          }
        }
      }

      if (!imageUrl) throw new Error("AI 未生成有效的 Logo 图片 URL");
      return imageUrl;
    } catch (error: any) {
      console.error("Logo generation error:", error);
      throw error;
    }
  }
}

export const aiService = new SelindellAIService();
export const geminiService = aiService;
