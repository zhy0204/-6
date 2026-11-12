export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { prompt, images, json_mode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, error: '伺服器未設定 GEMINI_API_KEY' });
    }

    // 固定使用 3.8-flash 模型
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    let parts = [{ text: prompt }];
    if (images && images.length > 0) {
      images.forEach(img => {
        const base64Data = img.includes(',') ? img.split(',')[1] : img;
        parts.push({
          inline_data: { mime_type: "image/jpeg", data: base64Data }
        });
      });
    }

    const reqData = { contents: [{ parts: parts }] };
    if (json_mode) {
      reqData.generationConfig = { response_mime_type: "application/json" };
    }

    // 💡 內建自動重試機制（針對 High Demand 流量過載）
    const maxRetries = 3;
    let response = null;
    let result = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData)
      });

      result = await response.json();

      if (response.ok) {
        break; // 成功就跳出迴圈
      }

      // 檢查是否為流量過載錯誤，且還有重試次數
      const errorMsg = JSON.stringify(result).toLowerCase();
      if (errorMsg.includes('high demand') && attempt < maxRetries - 1) {
        // 等待 1.5 秒後自動重試
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      } else {
        // 其他錯誤直接拋出
        throw new Error(result.error?.message || 'Gemini API 呼叫失敗');
      }
    }

    if (!response.ok) {
      throw new Error(result.error?.message || 'Gemini API 呼叫失敗');
    }

    const textRes = result.candidates[0].content.parts[0].text;
    const finalData = json_mode ? JSON.parse(textRes) : textRes;

    return res.status(200).json({ success: true, data: finalData });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
