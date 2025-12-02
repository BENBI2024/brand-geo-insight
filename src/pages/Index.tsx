import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, Target, TrendingUp } from "lucide-react";

const Index = () => {
  const [brandName, setBrandName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const navigate = useNavigate();

  const handleStartDiagnosis = async () => {
    if (!brandName.trim()) {
      toast.error("请输入品牌名称");
      return;
    }

    setIsLoading(true);
    
    try {
      // Step 1: Generate questions
      setCurrentStep("正在生成测试问题...");
      const questionsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandName }),
        }
      );

      if (!questionsResponse.ok) {
        throw new Error("生成问题失败");
      }

      const questionsData = await questionsResponse.json();
      const allQuestions = [
        ...questionsData.A,
        ...questionsData.B,
        ...questionsData.C,
      ];

      // Step 2: Generate answers
      setCurrentStep("正在生成测试回答...");
      const answersResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: allQuestions }),
        }
      );

      if (!answersResponse.ok) {
        throw new Error("生成回答失败");
      }

      const answers = await answersResponse.json();

      // Step 3: Score Geo
      setCurrentStep("正在计算 Geo 分数...");
      const scoresResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-geo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brandName, answers }),
        }
      );

      if (!scoresResponse.ok) {
        throw new Error("评分失败");
      }

      const scoresData = await scoresResponse.json();

      // Step 4: Generate report
      setCurrentStep("正在生成诊断报告...");
      const reportResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandName,
            scores: scoresData.scores,
            overallScore: scoresData.overallScore,
          }),
        }
      );

      if (!reportResponse.ok) {
        throw new Error("生成报告失败");
      }

      const reportData = await reportResponse.json();

      toast.success("诊断完成！");

      // Navigate to results page
      navigate("/results", {
        state: {
          brandName,
          scores: scoresData.scores,
          overallScore: scoresData.overallScore,
          report: reportData.report,
        },
      });
    } catch (error) {
      console.error("Diagnosis error:", error);
      toast.error(error instanceof Error ? error.message : "诊断过程出错");
    } finally {
      setIsLoading(false);
      setCurrentStep("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container max-w-4xl mx-auto py-16 px-4">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            AI 驱动的品牌理解度评估
          </div>
          <h1 className="text-5xl font-bold text-foreground">
            Geo 诊断系统
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            评估大语言模型对品牌的 Generative Engine Optimization 能力，
            通过多维度测试深入了解 AI 模型的品牌理解水平
          </p>
        </div>

        {/* Input Form */}
        <Card className="p-8 shadow-card mb-12">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                开始诊断
              </h2>
              <p className="text-muted-foreground">
                输入您想要评估的品牌名称，系统将自动生成测试问题并进行全面分析
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandName" className="text-base">
                品牌名称
              </Label>
              <Input
                id="brandName"
                placeholder="例如：喜茶、蔚来汽车、Apple..."
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                disabled={isLoading}
                className="text-lg py-6"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleStartDiagnosis();
                  }
                }}
              />
            </div>

            {currentStep && (
              <div className="flex items-center gap-3 text-primary bg-primary/10 p-4 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">{currentStep}</span>
              </div>
            )}

            <Button
              onClick={handleStartDiagnosis}
              disabled={isLoading}
              className="w-full py-6 text-lg bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  诊断进行中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  开始 Geo 诊断
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              诊断过程需要 1-2 分钟，请耐心等待
            </p>
          </div>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 shadow-card hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">多维度评估</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              从主动提及度、语义相关度、具体性三个维度全面评估品牌理解能力
            </p>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">智能分析</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              AI 自动生成问题、回答、评分，提供深入的品牌理解度分析报告
            </p>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">可视化报告</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              直观的图表展示和详细的诊断报告，支持 Markdown 格式导出
            </p>
          </Card>
        </div>

        {/* Info Section */}
        <div className="mt-12 text-center text-muted-foreground space-y-2">
          <p className="text-sm">
            本系统使用先进的 AI 模型进行品牌理解度评估
          </p>
          <p className="text-xs">
            评估维度：Salience (主动提及度) · Relevance (语义相关度) · Specificity (具体性)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
