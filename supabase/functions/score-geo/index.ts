const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, answers } = await req.json();
    console.log('Scoring Geo for brand:', brandName);

    if (!brandName || !answers || !Array.isArray(answers)) {
      throw new Error('Brand name and answers array are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `你是 Geo 评分器。品牌：${brandName}

评分规则：
1. Salience（主动提及度，0-1）：统计 answer 中出现品牌名次数
   - 0 次 = 0
   - 1 次 = 0.4
   - 2 次 = 0.7
   - >=3 次 = 1

2. Relevance（语义相关度，0-1）：评估回答与品牌的相关程度
   - 使用语义相似度判断，品牌相关性很高 = 0.8-1.0
   - 中等相关 = 0.4-0.7
   - 弱相关或无关 = 0-0.3

3. Specificity（具体性，0/0.5/1）：判断回答的具体程度
   - 1 = 很具体，提供详细信息
   - 0.5 = 一般具体
   - 0 = 非常泛化

单题 GeoScore = Salience*0.4 + Relevance*0.4 + Specificity*0.2

你必须返回严格的 JSON 格式：
{
  "scores": [
    {
      "question": "问题文本",
      "answer": "回答文本",
      "salience": 数字,
      "relevance": 数字,
      "specificity": 数字,
      "geoScore": 数字,
      "analysis": "一句话分析"
    }
  ],
  "overallScore": 数字（0-100）
}`;

    const answersText = JSON.stringify(answers);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请对以下问答进行评分：\n${answersText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('Scoring response:', content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    const scores = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(scores), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in score-geo:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
