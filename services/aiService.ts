
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export class SelindellAIService {
  private async callArkAPI(model: string, messages: any[], responseFormat?: any, signal?: AbortSignal) {
    const body: any = {
      model,
      messages
    };
    
    if (responseFormat) {
      body.response_format = responseFormat;
    }

    // Determine base URL dynamically or fallback to current origin
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${baseUrl}/api/ark-completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error (${response.status}): ${errorText.substring(0, 100)}...`);
      }
      throw new Error(errorObj.error?.message || `请求失败 (${response.status})`);
    }

    return await response.json();
  }

  private async callArkImageAPI(model: string, prompt: string, signal?: AbortSignal) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const response = await fetch(`${baseUrl}/api/ark-images-generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model, prompt }),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch (e) {
        throw new Error(`API Error (${response.status}): ${errorText.substring(0, 100)}...`);
      }
      throw new Error(errorObj.error?.message || `图片生成请求失败 (${response.status})`);
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

  async analyzeReferenceImage(base64Image: string, userPrompt: string, styleId?: string, signal?: AbortSignal): Promise<string> {
    try {
      let styleText = "萌趣Q版（潮玩手办）";
      if (styleId === "mecha") styleText = "机甲未来风（Sci-Fi Mecha）";
      else if (styleId === "retro") styleText = "中华复古风（国风）";
      else if (styleId === "pixel") styleText = "马赛克像素风（体素块级）";

      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `你是一个专业的3D手办原型分析师。请仔细分析这张图像并提取核心主体，用于后续全彩3D打印手办的生成。
用户指令：【${userPrompt ? userPrompt : "无，请自动提炼图片中的主要核心事物"}】
当前目标生成风格为：【${styleText}】

要求如下：
1. 锁定主体：严格遵循用户指令。若用户无明确指定且图片内有多个对象，请自动选择最显眼的核心事物（无论是人、动物、还是稀奇古怪的物品）。
2. 细节捕捉：抽取最核心的特征。如果是人像或生物面部，必须极度精准地抓住面部特征（如酒窝、高颧骨、深邃眼窝、塌鼻梁或高鼻梁、显著表情或独特的发型等）。如果是纯物品，提炼其最标志性的形态和结构。
3. ✨风格化脑补补全（核心要求）✨：手办必须是完整的全身形态！如果图像是不完整的（例如只有脸部、大头照、或半身照），你必须合理发挥想象力，为其脑补出极其搭配的完整下半身或缺失部位（如穿着什么衣服、裤子、鞋履，姿态如何），将其补全为一个完整的全身对象。
【重要】：脑补的内容必须与当前的【${styleText}】风格高度契合！
-> 若为机甲未来风：请脑补装甲、外骨骼或机械部件等。
-> 若为中华复古风：请脑补汉服、中式长袍或其他传统服饰等。
-> 若为马赛克像素风：请想象其由简单方块构成的样子等。
-> 若默认或萌趣Q版：优先脑补短胖可爱的短腿、大鞋子等。

将提取的面部细节和脑补补全的全身外观融合成一段具体、形象的中文描述文字（不要讲废话，直接给出描述，80-100字左右）。`
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
      const data = await this.callArkAPI("ep-20260606105123-vgfgq", messages, undefined, signal);
      return data.choices[0].message.content.trim();
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.error("Image analysis error:", e);
      return userPrompt || "A character";
    }
  }

  async expandPrompt(prompt: string, signal?: AbortSignal): Promise<string> {
    try {
      const data = await this.callArkAPI(
        "ep-20260606104808-xx4sf",
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
      description = await this.analyzeReferenceImage(base64Image, prompt, undefined, signal);
    }
    
    // Choose prompt based on language
    let promptContent = `请将 “${description}” 缩减为一个 4 到 5 个字的标题。只返回标题内容，不要任何其他文字。`;
    let maxLength = 5;
    
    try {
      const data = await this.callArkAPI(
        "ep-20260606104808-xx4sf",
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

  async generate360Creation(prompt: string, styleId: string, base64Image?: string | null, signal?: AbortSignal): Promise<string[]> {
    let coreSubject = prompt;
    if (base64Image) {
      coreSubject = await this.analyzeReferenceImage(base64Image, prompt, styleId, signal);
    }

    let finalPrompt = "";
    
    if (styleId === 'cute') {
      finalPrompt = `【画面构图】
纯白色背景，左右并排展示同一手办的两个完整3D渲染图：左侧为前视图，右侧为后视图。

【主体内容】
原型：${coreSubject}
动作：严格遵照用户要求的姿态。若未提及动作，则默认站立在底座上。

【风格与材质】
萌趣Q版（Chibi Pop Mart风格），二头身或三头身比例，大头小身，五官圆润可爱，高级感。
视觉上必须展现出全彩3D打印树脂制品的质感，拥有光滑的表面、温润的反光和真实的倒角，色彩干净明亮。整体光影为专业摄影棚级产品打光。

【生产工艺限制（绝对核心）】
1. 完全结构极简：没有高端复杂的元素，整体必须是粗壮、紧凑的团块状结构，没有零碎的漂浮物。
2. 杜绝易断件：绝不能有极细的四肢、纤细的武器、飞扬的发丝或细长的尾巴。需要突出的部分必须与身体或底座有厚实的物理连接。
3. 成本控制理念：造型去繁就简，为了节省耗材，坚决避免过度密集的镂空、刺状物或高精度纹理，确保能以极低的耗材和最简单的支撑结构实现一次性极简、低成本的3D打印。既要节省成本和简单，又要极具极简高级感。

【底座要求】
手办必须牢固连接在一个最最普通的那种纯白色圆形底座上。
左侧（前视图）的底座正前方必须清晰地印有“selindell”字样，不可拼错。右侧（后视图）底座背面没有任何文字。

【渲染纪律】
必须看起来像是一张真实的、已经生产出来的双视图潮玩商品照，严禁任何2D插画、线稿或平面设计感。绝对遵循上述结构极简低耗材要求。`;
    } else if (styleId === 'mecha') {
      finalPrompt = `【画面构图】
纯白色背景，左右并排展示同一手办的两个完整3D渲染图：左侧为前视图，右侧为后视图。

【主体内容】
原型：${coreSubject}
动作：严格遵照用户要求的姿态。若未提及动作，则默认站立在底座上。

【风格与材质】
机甲未来风（Sci-Fi Mecha风格），装甲块面要大、平整且钝角化，类似于工业积木或重型工模设备，展现出坚固的科幻感。
视觉上必须展现出全彩3D打印树脂制品的质感，拥有类似喷砂或哑光烤漆的表面、硬朗的光影和真实的倒角，色彩干净利落。整体光影为专业摄影棚级产品打光。

【生产工艺限制（绝对核心）】
1. 完全结构极简：没有高端或复杂的元素（如繁琐的管线、细碎的反应炉或外露的齿轮），整体必须是粗壮、紧凑的装甲块状结构，无任何漂浮物。
2. 杜绝易断件：绝不能有极细的天线、尖锐的利刃、纤细的液压杆或悬空的机翼。所有部件必须紧密拼合并与主体或底座有极其厚实的物理连接。
3. 成本控制理念：造型去繁就简，为了节省耗材，坚决避免过度密集的细节刻线，确保能以极低的耗材和最简单的支撑结构实现一次性极简、低成本的3D打印。既要节省成本和简单，又要极具极简高级感。

【底座要求】
手办必须牢固连接在一个最最普通的那种纯白色圆形底座上。
左侧（前视图）的底座正前方必须清晰地印有“selindell”字样，不可拼错。右侧（后视图）底座背面没有任何文字。

【渲染纪律】
必须看起来像是一张真实的、已经生产出来的双视图潮玩商品照，严禁任何2D插画、线稿或平面设计感。绝对遵循上述机甲极简低耗材要求。`;
    } else if (styleId === 'retro') {
      finalPrompt = `【画面构图】
纯白色背景，左右并排展示同一手办的两个完整3D渲染图：左侧为前视图，右侧为后视图。

【主体内容】
原型：${coreSubject}
动作：严格遵照用户要求的姿态。若未提及动作，则默认站立在底座上。

【风格与材质】
中华复古风（Neo-Chinese Retro风格），融入显著的“中国红”元素与传统东方美学，可适度包含祥云、中式建筑轮廓、国潮服饰等大面貌特征，色彩古朴高级。
视觉上必须展现出全彩3D打印树脂制品的质感，拥有类似经过抛光处理的温润陶瓷或高光烤漆的表面、高级的折射光影和真实的倒角，色彩干净、对比强烈。整体光影为专业摄影棚级产品打光。

【生产工艺限制（绝对核心）】
1. 完全结构极简：没有高端或复杂的元素，舍弃所有繁琐的刺绣纹理、细碎的流苏或飘带，整体必须是粗壮、紧凑的块状国风结构，无任何悬空或漂浮物。
2. 杜绝易断件：绝不能有极细的簪子、长而纤细的水袖、尖锐的配饰或悬空的折扇。所有突出部件（如发髻、披风）必须紧密贴合且与主体或底座有极其厚实的物理连接。
3. 成本控制理念：造型去繁就简，为了节省耗材，坚决避免过度密集的镂空花纹，确保能以极低的耗材和最简单的支撑结构实现一次性极简、低成本的3D打印。既要节省成本和简单，又要极具国潮国风的极简高级感。

【底座要求】
手办必须牢固连接在一个最最普通的那种纯白色圆形底座上。
左侧（前视图）的底座正前方必须清晰地印有“selindell”字样，不可拼错。右侧（后视图）底座背面没有任何文字。

【渲染纪律】
必须看起来像是一张真实的、已经生产出来的双视图潮玩商品照，严禁任何2D插画、线稿或平面设计感。绝对遵循上述结构极简低耗材要求。`;
    } else if (styleId === 'pixel') {
      finalPrompt = `【画面构图】
纯白色背景，左右并排展示同一手办的两个完整3D渲染图：左侧为前视图，右侧为后视图。

【主体内容】
原型：${coreSubject}
动作：严格遵照用户要求的姿态。若未提及动作，则默认站立在底座上。

【风格与材质】
马赛克像素风（Voxel / 3D Pixel Art风格），高度提炼的几何体，由少量、巨大且边缘微倒角的方块/积木块拼装构成，极其突出的体素化特征。
视觉上必须展现出全彩3D打印树脂制品的质感，拥有光滑平整的块面、干净的边缘反射和真实的物理倒角，色彩鲜明。整体光影为专业摄影棚级产品打光。

【生产工艺限制（绝对核心）】
1. 完全结构极简：这是最容易3D打印的风格，结构必须是由粗大、紧凑的方块简单堆叠拼合而成，绝无高端复杂的曲面或琐碎的高分辨率细节。
2. 杜绝易断件：绝不能有单薄的单像素方块延伸、细长杆或悬空的体素块。所有方块必须大面积互相咬合并与主体或底座有极其厚实的物理连接。
3. 成本控制理念：方块数量不需要多，要大而概括。确保能以极低的耗材和最简单的支撑结构实现一次性极简、低成本的3D打印。既要节省成本和简单，又要极具体素艺术的极简高级感。

【底座要求】
手办必须牢固连接在一个最最普通的那种纯白色圆形底座上。
左侧（前视图）的底座正前方必须清晰地印有“selindell”字样，不可拼错。右侧（后视图）底座背面没有任何文字。

【渲染纪律】
必须看起来像是一张真实的、已经生产出来的双视图潮玩商品照，严禁任何2D插画、线稿或平面设计感。绝对遵循上述结构极简低耗材要求。`;
    } else {
      let styleDesc = styleId; // Fallback

      finalPrompt = `白色纯净背景，实物潮玩手办。
主体内容：${coreSubject}。严格遵照用户要求的动作，若未提及则默认站立。
整体风格：${styleDesc}。绝不能复杂。
材质要求：必须展现出真实全彩3D打印树脂制品的质感。
设计要求：为了节省低耗材成本，造型必须结构极其简单、紧凑，绝对没有任何高端复杂的装饰、过大的悬空或极度纤细的易断部件（无细长发丝、指尖、飘带等），极简且高级。
底座要求：主体必须站在一个最最普通的那种纯白色圆形底座上。左侧前视图底座必须清晰带有“selindell”字样，右侧后视图底座无字。
构图与视角：图像必须侧对侧首尾并排展示两个同一手办的完整3D渲染图——左侧为前视图，右侧为后视图。
画面渲染：两视图均需全彩实物级3D，摄影棚级布光，像真实摆放的手办极简商品照。`;
    }

    try {
      const data = await this.callArkImageAPI(
        "ep-20260606105301-zmbjm",
        finalPrompt,
        signal
      );

      if (!data.data || data.data.length === 0) {
        throw new Error("Ark 未返回任何图片");
      }

      const imageUrl = data.data[0].url;

      if (!imageUrl) {
        console.log("Ark 完整回复对象:", JSON.stringify(data, null, 2));
        throw new Error(`AI 未返回图像。`);
      }

      return [imageUrl];
    } catch (error: any) {
      if (error.name !== 'AbortError' && !(error.message && error.message.toLowerCase().includes('abort'))) {
        console.error("Image generation error:", error);
      }
      throw new Error(error.message || "造物引擎暂时无法响应");
    }
  }

  async generateLoreAndStats(prompt: string, signal?: AbortSignal) {
    try {
      const data = await this.callArkAPI(
        "ep-20260606104808-xx4sf",
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
      const data = await this.callArkAPI(
        "ep-20260606104808-xx4sf",
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
      // 1. 先用视觉模型分析图片内容
      const imageDesc = await this.analyzeReferenceImage(base64Image, "描述这个图案的主要视觉元素、形状和特征，要极其简短，作为生成Logo的参考。", undefined, signal);

      // 2. 将内容和风格结合，发送给图片生成引擎
      const finalPrompt = `请根据以下描述设计一个Logo图案：${imageDesc}。风格要求：${stylePrompt}`;

      const data = await this.callArkImageAPI(
        "ep-20260606105301-zmbjm",
        finalPrompt,
        signal
      );

      if (!data.data || data.data.length === 0) {
        throw new Error("Ark 未返回任何内容");
      }

      const imageUrl = data.data[0].url;

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
