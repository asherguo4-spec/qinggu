import fetch from 'node-fetch';

async function test() {
  const apiKey = process.env.VOLCENGINE_API_KEY || process.env.ARK_API_KEY || "your_api_key_here";
  const prompt = `【画面构图】
纯白色背景，左右并排展示同一手办的两个完整3D渲染图：左侧为前视图，右侧为后视图。

【主体内容】
原型：一只可爱的猫咪
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

  console.log("Length:", prompt.length);

  // We won't actually call if we don't have the API key in this script, but let's check what the backend is receiving
}
test();
