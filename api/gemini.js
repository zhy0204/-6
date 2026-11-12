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

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqData)
    });

    const result = await response.json();
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
