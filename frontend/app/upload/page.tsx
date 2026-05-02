'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function UploadPage() {
  const router = useRouter()
  const { markDetectionComplete } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    fileName: string
    status: 'processing' | 'complete' | 'error'
    anomaliesFound: number
    processingTime: number
    message: string
    description?: string | null
    recommendation?: string | null
  } | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0]
      // Validate file type
      if (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.json') || droppedFile.name.endsWith('.pcap')) {
        setFile(droppedFile)
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsProcessing(true)
    setUploadResult(null)

    const startedAt = performance.now();

    try {
    const fileText = await file.text();
    const jsonData = JSON.parse(fileText);

    const res = await fetch("http://localhost:5000/api/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonData),
    });
    const data = await res.json()
    const elapsedSec = (performance.now() - startedAt) / 1000;


    if (res.ok) {
      // Backend returns either a single result or { count, attacks, results: [...] }
      const isBatch = Array.isArray(data?.results);
      const anomaliesFound = isBatch
        ? data.attacks
        : (data.is_attack ? 1 : 0);
      const message = isBatch
        ? `Analyzed ${data.count} record${data.count === 1 ? '' : 's'} — ${data.attacks} attack${data.attacks === 1 ? '' : 's'} detected`
        : (data.prediction || "Prediction complete");

      // For batches, surface the most common attack class's explanation
      let description: string | null = null;
      let recommendation: string | null = null;
      if (isBatch) {
        const attacks = (data.results || []).filter((r: any) => r.is_attack);
        if (attacks.length > 0) {
          const counts = attacks.reduce((acc: Record<string, number>, r: any) => {
            acc[r.prediction] = (acc[r.prediction] || 0) + 1;
            return acc;
          }, {});
          const top = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0];
          const sample = attacks.find((r: any) => r.prediction === top);
          description = sample?.description ?? null;
          recommendation = sample?.recommendation ?? null;
        }
      } else {
        description = data.description ?? null;
        recommendation = data.recommendation ?? null;
      }

      setUploadResult({
        fileName: file.name,
        status: "complete",
        anomaliesFound,
        processingTime: Number(elapsedSec.toFixed(2)),
        message,
        description,
        recommendation,
      });
      markDetectionComplete();
    } else {
      setUploadResult({
        fileName: file.name,
        status: "error",
        anomaliesFound: 0,
        processingTime: 0,
        message: data.error || "Failed to process file",
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
    setUploadResult({
      fileName: file.name,
      status: "error",
      anomaliesFound: 0,
      processingTime: 0,
      message: "Invalid JSON or server error",
    });
  }  finally {
    setIsProcessing(false);
  }
  
};
  

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload Data</h1>
          <p className="text-muted-foreground mt-1">
            Upload network logs for anomaly detection analysis
          </p>
        </div>

        {/* Upload Card */}
        <Card className="p-8 border-border bg-card">
          {!uploadResult ? (
            <div className="space-y-6">
              {/* File Input - Hidden */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".csv,.json,.pcap"
                className="hidden"
              />

              {/* Drag & Drop Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer group ${
                  isDragging
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
                    isDragging
                      ? 'bg-primary/30'
                      : 'bg-primary/10 group-hover:bg-primary/20'
                  }`}>
                    <Upload className={`w-8 h-8 transition-colors ${
                      isDragging ? 'text-primary animate-pulse' : 'text-primary'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {file ? file.name : 'Drag and drop your file here'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {file ? 'File selected' : 'or click to browse'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: CSV, JSON, PCAP (Max 500MB)
                  </p>
                </div>
              </div>

              {/* Upload Button */}
              {file && (
                <Button
                  onClick={handleUpload}
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 glow-box-blue"
                >
                  {isProcessing ? 'Processing...' : 'Detect Anomalies'}
                </Button>
              )}
            </div>
          ) : (
            /* Results */
            <div className="space-y-6">
              <div className="text-center">
                <div className={`w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4 ${
                  uploadResult.status === 'complete'
                    ? 'bg-green-500/20'
                    : 'bg-destructive/20'
                }`}>
                  {uploadResult.status === 'complete' ? (
                    <Check className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {uploadResult.message}
                </h2>
                <p className="text-muted-foreground mt-2">{uploadResult.fileName}</p>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-sm text-muted-foreground">Anomalies Found</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {uploadResult.anomaliesFound}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-sm text-muted-foreground">Processing Time</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {uploadResult.processingTime}s
                  </p>
                </div>
              </div>

              {/* Explanation + Recommended Action */}
              {uploadResult.status === 'complete' && uploadResult.description && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wide mb-1">
                      Why this was flagged
                    </p>
                    <p className="text-sm text-foreground">{uploadResult.description}</p>
                  </div>
                  {uploadResult.recommendation && (
                    <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
                        Recommended Action
                      </p>
                      <p className="text-sm text-foreground">{uploadResult.recommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={() => {
                    setFile(null)
                    setUploadResult(null)
                  }}
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10"
                >
                  Upload Another
                </Button>
                <Button 
                  onClick={() => router.push('/results')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  View Results
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Info Cards */}
        {!uploadResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Fast Processing',
                description: 'Analyze large datasets in seconds',
              },
              {
                title: 'Accurate Detection',
                description: '98.7% accuracy in anomaly identification',
              },
              {
                title: 'Detailed Reports',
                description: 'Get comprehensive analysis of results',
              },
            ].map((info, idx) => (
              <Card
                key={idx}
                className="p-4 border-border bg-card hover:bg-card/80 transition-all"
              >
                <h3 className="font-semibold text-foreground mb-2">{info.title}</h3>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
