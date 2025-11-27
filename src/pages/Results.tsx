import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Score {
  question: string;
  answer: string;
  salience: number;
  relevance: number;
  specificity: number;
  geoScore: number;
  analysis: string;
}

interface ResultsData {
  brandName: string;
  scores: Score[];
  overallScore: number;
  report: string;
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = location.state as ResultsData;
    if (!data) {
      toast.error("无诊断数据");
      navigate("/");
      return;
    }
    setResultsData(data);
    setIsLoading(false);
  }, [location.state, navigate]);

  if (isLoading || !resultsData) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { brandName, scores, overallScore, report } = resultsData;

  // Calculate average scores for each dimension
  const avgSalience = scores.reduce((sum, s) => sum + s.salience, 0) / scores.length;
  const avgRelevance = scores.reduce((sum, s) => sum + s.relevance, 0) / scores.length;
  const avgSpecificity = scores.reduce((sum, s) => sum + s.specificity, 0) / scores.length;

  const radarData = [
    { dimension: "Salience", value: avgSalience * 100 },
    { dimension: "Relevance", value: avgRelevance * 100 },
    { dimension: "Specificity", value: avgSpecificity * 100 },
  ];

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brandName}-geo-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Markdown 报告已下载");
  };

  return (
    <div className="min-h-screen bg-gradient-bg py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {brandName} - Geo 诊断报告
          </h1>
          <Button onClick={handleDownloadMarkdown} className="gap-2">
            <Download className="h-4 w-4" />
            下载报告
          </Button>
        </div>

        {/* Overall Score */}
        <Card className="p-8 shadow-card">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">总体 Geo 分数</h2>
            <div className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {overallScore.toFixed(1)}
            </div>
            <div className="text-muted-foreground">/ 100</div>
            <Progress value={overallScore} className="h-3" />
          </div>
        </Card>

        {/* Dimensions Chart */}
        <Card className="p-8 shadow-card">
          <h2 className="text-2xl font-semibold text-foreground mb-6">维度表现</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="分数"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Salience (主动提及度)</span>
                  <span className="text-primary">{(avgSalience * 100).toFixed(1)}</span>
                </div>
                <Progress value={avgSalience * 100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Relevance (语义相关度)</span>
                  <span className="text-primary">{(avgRelevance * 100).toFixed(1)}</span>
                </div>
                <Progress value={avgRelevance * 100} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Specificity (具体性)</span>
                  <span className="text-primary">{(avgSpecificity * 100).toFixed(1)}</span>
                </div>
                <Progress value={avgSpecificity * 100} />
              </div>
            </div>
          </div>
        </Card>

        {/* Individual Scores */}
        <Card className="p-8 shadow-card">
          <h2 className="text-2xl font-semibold text-foreground mb-6">单题分析</h2>
          <div className="space-y-6">
            {scores.map((score, index) => (
              <div key={index} className="border border-border rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-lg text-foreground">问题 {index + 1}</h3>
                <p className="text-muted-foreground">{score.question}</p>
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm">{score.answer}</p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Salience:</span>
                    <span className="ml-2 font-semibold text-primary">
                      {(score.salience * 100).toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Relevance:</span>
                    <span className="ml-2 font-semibold text-primary">
                      {(score.relevance * 100).toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Specificity:</span>
                    <span className="ml-2 font-semibold text-primary">
                      {(score.specificity * 100).toFixed(0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">总分:</span>
                    <span className="ml-2 font-semibold text-primary">
                      {(score.geoScore * 100).toFixed(1)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic">{score.analysis}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Full Report */}
        <Card className="p-8 shadow-card">
          <h2 className="text-2xl font-semibold text-foreground mb-6">完整报告</h2>
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Results;
