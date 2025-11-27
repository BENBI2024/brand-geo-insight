const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName } = await req.json();
    console.log('Generating questions for brand:', brandName);

    if (!brandName) {
      throw new Error('Brand name is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `你是一名品牌知识理解度测试设计师。基于品牌名生成三类问题（每类 3 条），且**不能在问题中直接出现品牌名字**。

A 类（开放类）：完全开放，不提品牌（测试主动联想/Salience），例如"列举十个中国新式茶饮品牌"。
B 类（领域限定）：限定行业/场景，不提品牌，例如"近年来哪些主打东方美学的新式饮品品牌？"。
C 类（特征暗示）：根据品牌公开特征做暗示性问题（不点名），例如"某个强调风味标准化、以城市自然美学为主题的茶饮品牌，你会如何描述它的用户？"。

你必须返回严格的 JSON 格式，不要添加任何其他文本：
{
  "A": ["问题1", "问题2", "问题3"],
  "B": ["问题1", "问题2", "问题3"],
  "C": ["问题1", "问题2", "问题3"]
}`;

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
          { role: 'user', content: `请为品牌"${brandName}"生成问题。` }
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
    console.log('Generated questions response:', content);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from AI response');
    }

    const questions = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(questions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
