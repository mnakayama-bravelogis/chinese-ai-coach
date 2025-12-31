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
  "meanings": [
    {
      "part_of_speech": "品詞",
      "short_definition": "一言で表す簡単な意味（訳）",
      "definition": "意味の解説。一般的な使われ方を主軸にし、必要に応じて原義を補足。一つの単語で動詞・名詞など複数の意味がある場合は、必ず意味ごとにエントリを分けてください。",
      "examples": [
        { "scenario": "シチュエーション", "zh": "中国語例文1", "jp": "日本語訳1" },
        { "scenario": "シチュエーション", "zh": "中国語例文2", "jp": "日本語訳2" }
      ]
    }
  ],
  "synonyms": [{ "word": "...", "pinyin": "...", "nuance": "..." }],
  "usage_tips": "...",
  "summary": ["...", "...", "..."]
}
Note: 各意味(meaning)に対し、必ず2つ以上の例文(examples)を作成してください。`,
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
