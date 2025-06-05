"use client"
"use client"
import { useState, useRef } from "react"
import { Upload, Eye, Trash2, Brain, TrendingUp, BarChart3, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"
import dynamic from 'next/dynamic';
import { ConfidenceDistributionChart } from "@/components/dashboard/ConfidenceDistributionChart"

const PercentageDistributionChart = dynamic(
  () => import("@/components/dashboard/PercentageDistributionChart").then((mod) => mod.PercentageDistributionChart),
  { ssr: false }
);

const actionTranslations: { [key: string]: string } = {
  "Calling": "Chamando",
  "Clapping": "Batendo Palmas",
  "Cycling": "Andando de Bicicleta",
  "Dancing": "Dançando",
  "Drinking": "Bebendo",
  "Eating": "Comendo",
  "Fighting": "Lutando",
  "Hugging": "Abraçando",
  "Laughing": "Rindo",
  "Listening to Music": "Ouvindo Música",
  "Running": "Correndo",
  "Sitting": "Sentado",
  "Sleeping": "Dormindo",
  "Texting": "Digitando",
  "Using Laptop": "Usando Notebook"
}

function getTranslatedAction(action: string): string {
  return actionTranslations[action] || action
}

export default function ActionRecognitionInterface() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any[]>([])
  const [detailedStats, setDetailedStats] = useState<any[]>([])
  const [percentageDistributionData, setPercentageDistributionData] = useState<any[]>([])
  const [confidenceDistributionData, setConfidenceDistributionData] = useState<any[]>([])
  const [analysisStarted, setAnalysisStarted] = useState(false) // Novo estado
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null
    if (event.type === 'change') {
      files = (event as React.ChangeEvent<HTMLInputElement>).target.files
    } else if (event.type === 'drop') {
      event.preventDefault()
      files = (event as React.DragEvent<HTMLDivElement>).dataTransfer.files
    }

    if (files) {
      const newFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
      setSelectedFiles(prevFiles => [...prevFiles, ...newFiles])
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return

    setIsAnalyzing(true)
    setAnalysisStarted(true) // Ativa o estado de análise iniciada
    setAnalysisResults([])
    setDetailedStats([])
    setPercentageDistributionData([])
    setConfidenceDistributionData([])

    const formData = new FormData()
    selectedFiles.forEach((file) => {
      formData.append('images', file)
    })

    try {
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const newAnalysisResults = data.image_results.map((imgResult: any, index: number) => {
        const topPrediction = imgResult.top_5_predictions[0]
        const colors = [
          "from-emerald-500 to-teal-600",
          "from-rose-500 to-pink-600",
          "from-blue-500 to-cyan-600",
          "from-violet-500 to-purple-600",
          "from-orange-500 to-amber-600",
        ]
        return {
          id: index + 1,
          image: URL.createObjectURL(selectedFiles.find(f => f.name === imgResult.filename) || new File([], "")),
          action: getTranslatedAction(topPrediction.action),
          confidence: topPrediction.confidence * 100,
          color: colors[index % colors.length],
          filename: imgResult.filename,
          top_5_predictions: imgResult.top_5_predictions.map((p: any) => ({
            action: getTranslatedAction(p.action),
            confidence: p.confidence * 100,
          })),
          showDetails: false,
        }
      })
      setAnalysisResults(newAnalysisResults)

      const actionAverages: { [key: string]: number } = {}
      const actionCounts: { [key: string]: number } = {}

      data.image_results.forEach((result: any) => {
        if (!result.error && result.top_5_predictions) {
          result.top_5_predictions.forEach((pred: any) => {
            const action = pred.action
            const confidence = pred.confidence

            if (!actionAverages[action]) {
              actionAverages[action] = 0
              actionCounts[action] = 0
            }
            actionAverages[action] += confidence
            actionCounts[action]++
          })
        }
      })

      const newDetailedStats = Object.entries(actionAverages)
        .map(([action, sumConfidence]) => {
          const average = sumConfidence / actionCounts[action]
          return { action: getTranslatedAction(action), percentage: parseFloat((average * 100).toFixed(2)), trend: "stable" }
        })
        .sort((a, b) => b.percentage - a.percentage)

      const sumOfActionPercentages = newDetailedStats.reduce((sum, stat) => sum + stat.percentage, 0)
      const overallAverageConfidence = newDetailedStats.length > 0 ? sumOfActionPercentages / newDetailedStats.length : 0

      setDetailedStats(prevStats => [{ action: "Média Geral", percentage: parseFloat(overallAverageConfidence.toFixed(2)), trend: "stable" }, ...newDetailedStats])

      setPercentageDistributionData(newDetailedStats
        .filter(stat => stat.action !== "Média Geral")
        .map(stat => ({
          name: stat.action,
          value: stat.percentage,
        })));

      setConfidenceDistributionData(newDetailedStats
        .filter(stat => stat.action !== "Média Geral")
        .map(stat => ({
          name: stat.action,
          Confiança: stat.percentage,
        })));

    } catch (error) {
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleToggleDetails = (id: number) => {
    setAnalysisResults(prevResults =>
      prevResults.map(result =>
        result.id === id ? { ...result, showDetails: !result.showDetails } : result
      )
    )
  }

  const handleClearResults = () => {
    setSelectedFiles([])
    setAnalysisResults([])
    setDetailedStats([])
    setPercentageDistributionData([])
    setConfidenceDistributionData([])
    setAnalysisStarted(false) // Desativa o estado de análise iniciada
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 backdrop-blur-sm rounded-full border border-white/20 shadow-lg">
            <Brain className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Reconhecimento de Ações Humanas
            </h1>
          </div>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Análise de comportamentos e ações em imagens usando Machine Learning
          </p>
        </div>

        <div className={`flex flex-col lg:flex-row gap-8 transition-all duration-500 ease-in-out ${!analysisStarted ? 'justify-center items-start h-[calc(100vh-100px)] pt-16' : ''}`}>
          <div className={`space-y-6 ${!analysisStarted ? 'w-full max-w-lg mx-auto' : 'lg:w-2/3 mr-auto'}`}>
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <Upload className="w-6 h-6 text-indigo-600" />
                  Upload de Imagens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-all duration-300 relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileChange}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-slate-700">{selectedFiles.length} arquivos selecionados</p>
                      <p className="text-slate-500">Arraste e solte ou clique para selecionar</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isAnalyzing ? (
                      <>
                        <Zap className="w-5 h-5 mr-2 animate-pulse" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" />
                        Analisar Imagens
                      </>
                    )}
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={handleClearResults}
                    disabled={analysisResults.length === 0}
                    className="px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                  >
                    <Trash2 className="w-5 h-5 mr-2" />
                    Limpar Todas as Análises
                  </Button>
                </div>
              </CardContent>
            </Card>

            {analysisStarted && (
              <div className="grid md:grid-cols-2 gap-6">
                {analysisResults.map((result) => (
                  <Card
                    key={result.id}
                    className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/90 backdrop-blur-sm overflow-hidden"
                  >
                    <div className="relative">
                      <Image
                        src={result.image || "/placeholder.svg"}
                        alt={`Análise ${result.id}`}
                        width={300}
                        height={200}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t ${result.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                      />
                    </div>

                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className={`bg-gradient-to-r ${result.color} text-white px-3 py-1 text-sm font-semibold`}>
                          {result.action}
                        </Badge>
                        <span className="text-2xl font-bold text-slate-700">{result.confidence.toFixed(1)}%</span>
                      </div>

                      <Progress value={result.confidence} className="h-3 bg-slate-100" />

                      <Button
                        variant="outline"
                        onClick={() => handleToggleDetails(result.id)}
                        className="w-full group-hover:bg-slate-50 transition-colors duration-300 rounded-lg"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {result.showDetails ? "Esconder Detalhes" : "Ver Detalhes"}
                      </Button>

                      {result.showDetails && (
                        <div className="w-full space-y-2 text-left text-sm text-slate-600">
                          <h4 className="font-semibold text-slate-700">Top 5 Predições:</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {result.top_5_predictions.map((pred: any, idx: number) => (
                              <li key={idx}>
                                {pred.action}: {pred.confidence.toFixed(2)}%
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {analysisStarted && (
            <div className="space-y-6 lg:w-1/3">
              {detailedStats.length > 0 && (
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <BarChart3 className="w-6 h-6 text-indigo-600" />
                      Análise Detalhada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl">
                      <h3 className="font-semibold text-slate-700 mb-2">Média Geral das Predições</h3>
                      <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {detailedStats[0].percentage.toFixed(1)}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      {detailedStats.slice(1).map((stat, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                stat.trend === "up"
                                  ? "bg-green-500"
                                  : stat.trend === "down"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                              }`}
                            />
                            <span className="text-sm font-medium text-slate-700">{stat.action}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-600">{stat.percentage}%</span>
                            <TrendingUp
                              className={`w-4 h-4 ${
                                stat.trend === "up"
                                  ? "text-green-500"
                                  : stat.trend === "down"
                                    ? "text-red-500 rotate-180"
                                    : "text-yellow-500"
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {percentageDistributionData.length > 0 && (
                <PercentageDistributionChart data={percentageDistributionData} />
              )}
              {confidenceDistributionData.length > 0 && (
                <ConfidenceDistributionChart data={confidenceDistributionData} />
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
