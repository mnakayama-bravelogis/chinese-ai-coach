import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const handler = async (event, context) => {
    // CORS handling
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { word } = JSON.parse(event.body);

        if (!word) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Word is required' }),
            };
        }

        const response = await openai.chat.completions.create({
            // 環境変数 OPENAI_MODEL でモデルを切り替え可能。デフォルトは gpt-4o。
            model: process.env.OPENAI_MODEL || 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Role: プロの中国語ビジネスコーチ
Constraint: 以下のJSONスキーマのみを出力（Markdown禁止）。
JSON Schema:
{
  "word": "単語",
  "pinyin": "ピンイン",
  "definitions": { "original": "原義", "derived": "派生義", "context": "文脈" },
  "part_of_speech": "品詞",
  "examples": [{ "scenario": "...", "zh": "...", "jp": "...", "note": "..." }],
  "synonyms": [{ "word": "...", "pinyin": "...", "nuance": "..." }],
  "usage_tips": "...",
  "summary": ["...", "...", "..."]
}`,
                },
                {
                    role: 'user',
                    content: `解説する単語: ${word}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const result = JSON.parse(response.choices[0].message.content);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        };
    } catch (error) {
        console.error('AI generation error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Failed to generate content', details: error.message }),
        };
    }
};
