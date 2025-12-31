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
Constraint: JSON出力のみ。
Schema:
{
  "word": "単語",
  "pinyin": "ピンイン",
  "meanings": [
    {
      "part_of_speech": "品詞",
      "short_definition": "簡単な訳",
      "definition": "詳細解説（原義含む）",
      "examples": [{ "scenario": "...", "zh": "...", "jp": "..." }]
    }
  ],
  "synonyms": [{ "word": "...", "pinyin": "...", "nuance": "..." }],
  "usage_tips": "...",
  "summary": ["..."]
}
Note: 各意味(meaning)に対し例文は2つ。簡潔かつ正確に。`
                },
                {
                    role: 'user',
                    content: `単語: ${word}`,
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
