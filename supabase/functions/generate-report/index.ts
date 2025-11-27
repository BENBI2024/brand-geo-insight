const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brandName, scores, overallScore } = await req.json();
    console.log('Generating report for brand:', brandName);

    if (!brandName || !scores || overallScore === undefined) {
      throw new Error('Brand name, scores, and overallScore are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `你是一名专业的品牌分析报告撰写师。基于评分数据生成一份专业的 Markdown 报告。

报告结构：
# Geo 品牌理解度诊断报告

## 1. 总体 Geo 分数
展示总分和评级

## 2. 维度表现
展示三个维度的平均分数和分析

## 3. 单题分析
每题包含：
- 问题
- 回答摘要
- 各维度得分
- 一句话分析

## 4. 模型理解瓶颈
总结主要问题

## 5. 优化建议
提供 3-5 条可执行建议

要求：
- 使用专业术语
- 数据清晰
- 分析深入
- 建议具体可行`;

    const dataText = `品牌：${brandName}
总分：${overallScore}
详细评分：${JSON.stringify(scores, null, 2)}`;

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
          { role: 'user', content: `请生成报告：\n${dataText}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const report = data.choices[0].message.content;
    console.log('Generated report');

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
