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
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Role: 中国語ビジネスコーチ
Context: 中国語学習者が単語や表現を検索しています。
Constraint: JSONのみ出力。

Behavior:
1. 入力が「日本語」（例: 肩こり）の場合：
   - 複数の適切な中国語の候補をリストアップ。
   - Schema:
     {
       "type": "candidates",
       "candidates": [
         {
           "zh": "単語",
           "pinyin": "ピンイン",
           "jp_meaning": "日本語の意味",
           "usage": "口 / 書 / 口・書",
           "recommendation": 1-3 (星3が最高おすすめ)
         }
       ]
     }

2. 入力が「中国語」または「1つの確定した単語の詳細」を求めている場合：
   - 指定の単語を詳しく解析。
   - Schema:
     {
       "type": "detail",
       "word": "単語",
       "pinyin": "ピンイン",
       "meanings": [
         {
           "part_of_speech": "品詞",
           "short_definition": "簡単な訳",
           "definition": "詳細解説",
           "examples": [{ "scenario": "...", "zh": "...", "jp": "..." }]
         }
       ],
       "synonyms": [{ "word": "...", "pinyin": "...", "nuance": "..." }],
       "usage_tips": "...",
       "summary": ["..."]
     }

Note: 日本語検索時は、文脈やニュアンスが異なるものを3-5つ挙げてください。`
                },
                {
                    role: 'user',
                    content: `入力: ${word}`,
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
