import { useState } from 'react'
import { toast } from 'sonner'
import { generateInsights } from '@/lib/insights'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, RefreshCw } from 'lucide-react'

function InsightsPanel({ project, leads }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const result = await generateInsights(project, leads)
      setInsights(result)
    } catch (err) {
      toast.error(err.message || 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  if (leads.length === 0) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Insights
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : insights ? 'Refresh' : 'Generate'}
        </Button>
      </CardHeader>
      <CardContent>
        {!insights && !loading && (
          <p className="text-sm text-muted-foreground">
            Get AI-generated observations about this lead list.
          </p>
        )}
        {insights && (
          <ul className="space-y-1.5 text-sm">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">✓</span>
                <span className="text-foreground">{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default InsightsPanel