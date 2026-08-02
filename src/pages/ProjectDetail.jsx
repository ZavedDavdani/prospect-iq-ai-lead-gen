import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabaseClient'
import { enrichLead } from '@/lib/enrichment'
import { scoreLead } from '@/lib/scoring'
import { generateOutreach, rewriteOutreachText, TONES } from '@/lib/outreach'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ScoreBadge from '@/components/ScoreBadge'
import CriteriaChecklist from '@/components/CriteriaChecklist'
import InsightsPanel from '@/components/InsightsPanel'
import InitialsAvatar from '@/components/InitialsAvatar'
import { useDarkMode } from '@/hooks/useDarkMode'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Mail, Download, Copy, Sun, Moon } from 'lucide-react'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  company: z.string().optional(),
  role: z.string().optional(),
  domain: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
})

function getPrimaryAction(lead) {
  if (!lead.enrichment_data) return 'enrich'
  if (typeof lead.score !== 'number') return 'score'
  return 'outreach'
}

function ProjectDetail() {
  const { id } = useParams()
  const [isDark, setIsDark] = useDarkMode()
  const [project, setProject] = useState(null)
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('add-leads')
  const [tabInitialized, setTabInitialized] = useState(false)
  const [expandedExplanation, setExpandedExplanation] = useState(null)
  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [enrichingId, setEnrichingId] = useState(null)
  const [scoringId, setScoringId] = useState(null)

  const [outreachOpen, setOutreachOpen] = useState(false)
  const [outreachLead, setOutreachLead] = useState(null)
  const [outreachTone, setOutreachTone] = useState('professional')
  const [outreachGenerating, setOutreachGenerating] = useState(false)
  const [outreachSaving, setOutreachSaving] = useState(false)
  const [rewritingField, setRewritingField] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [linkedinMessage, setLinkedinMessage] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(leadSchema) })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchProject(), fetchLeads()])
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!loading && !tabInitialized) {
      setActiveTab(leads.length > 0 ? 'leads' : 'add-leads')
      setTabInitialized(true)
    }
  }, [loading, leads, tabInitialized])

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      toast.error('Failed to load project')
    } else {
      setProject(data)
    }
  }

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load leads')
    } else {
      setLeads(data)
    }
  }

  const onManualAdd = async (formData) => {
    const { error } = await supabase.from('leads').insert({
      project_id: id,
      name: formData.name,
      company: formData.company || null,
      role: formData.role || null,
      domain: formData.domain || null,
      email: formData.email || null,
      source: 'manual',
    })

    if (error) {
      toast.error('Failed to add lead')
      return
    }

    toast.success('Lead added')
    reset()
    fetchLeads()
  }

  const handleDeleteLead = async (leadId) => {
    const { error } = await supabase.from('leads').delete().eq('id', leadId)

    if (error) {
      toast.error('Failed to delete lead')
      return
    }

    toast.success('Lead deleted')
    fetchLeads()
  }

  const handleEnrich = async (lead) => {
    setEnrichingId(lead.id)
    const toastId = toast.loading(`Enriching ${lead.name}...`)

    try {
      const result = await enrichLead(lead)

      const { error } = await supabase
        .from('leads')
        .update({ enrichment_data: result })
        .eq('id', lead.id)

      if (error) {
        toast.error('Failed to save enrichment data', { id: toastId })
        return
      }

      if (result.isMock) {
        toast.warning(result.reason || 'Used fallback enrichment data', { id: toastId })
      } else {
        toast.success('Lead enriched successfully', { id: toastId })
      }

      fetchLeads()
    } catch (err) {
      toast.error(err.message || 'Failed to enrich lead', { id: toastId })
    } finally {
      setEnrichingId(null)
    }
  }

  const handleScore = async (lead) => {
    setScoringId(lead.id)
    const toastId = toast.loading(`Scoring ${lead.name}...`)

    try {
      const { score, explanation, criteria } = await scoreLead(lead, project)

      const { error } = await supabase
        .from('leads')
        .update({ score, score_explanation: explanation, score_criteria: criteria })
        .eq('id', lead.id)

      if (error) {
        toast.error('Failed to save score', { id: toastId })
        return
      }

      toast.success(`Scored ${score}/100`, { id: toastId })
      fetchLeads()
    } catch (err) {
      toast.error(err.message || 'Failed to score lead. Please try again.', { id: toastId })
    } finally {
      setScoringId(null)
    }
  }

  const openOutreachDialog = async (lead) => {
    setOutreachLead(lead)
    setOutreachTone('professional')
    setEmailSubject('')
    setEmailBody('')
    setLinkedinMessage('')
    setOutreachOpen(true)

    const { data, error } = await supabase
      .from('outreach_drafts')
      .select('*')
      .eq('lead_id', lead.id)

    if (!error && data) {
      const emailDraft = data.find((d) => d.channel === 'email')
      const linkedinDraft = data.find((d) => d.channel === 'linkedin')

      if (emailDraft) {
        setEmailSubject(emailDraft.subject || '')
        setEmailBody(emailDraft.body || '')
        setOutreachTone(emailDraft.tone || 'professional')
      }
      if (linkedinDraft) {
        setLinkedinMessage(linkedinDraft.body || '')
      }
    }
  }

  const handleGenerateOutreach = async () => {
    setOutreachGenerating(true)
    const toastId = toast.loading('Drafting outreach...')

    try {
      const result = await generateOutreach(outreachLead, project, outreachTone)
      setEmailSubject(result.emailSubject)
      setEmailBody(result.emailBody)
      setLinkedinMessage(result.linkedinMessage)
      toast.success('Outreach drafted', { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Failed to generate outreach. Please try again.', { id: toastId })
    } finally {
      setOutreachGenerating(false)
    }
  }

  const handleRewrite = async (field, action) => {
    const currentText = field === 'emailBody' ? emailBody : linkedinMessage

    if (!currentText) {
      toast.error('Nothing to rewrite yet — generate a draft first')
      return
    }

    setRewritingField(field)
    const toastId = toast.loading('Rewriting...')

    try {
      const targetTone = action === 'tone' ? outreachTone : null
      const rewritten = await rewriteOutreachText(currentText, action, targetTone)

      if (field === 'emailBody') {
        setEmailBody(rewritten)
      } else {
        setLinkedinMessage(rewritten)
      }

      toast.success('Rewritten', { id: toastId })
    } catch (err) {
      toast.error(err.message || 'Failed to rewrite. Please try again.', { id: toastId })
    } finally {
      setRewritingField(null)
    }
  }

  const handleSaveOutreach = async () => {
    if (!emailBody && !linkedinMessage) {
      toast.error('Generate or write a draft before saving')
      return
    }

    setOutreachSaving(true)

    const { data: existing } = await supabase
      .from('outreach_drafts')
      .select('id, channel')
      .eq('lead_id', outreachLead.id)

    const existingEmail = existing?.find((d) => d.channel === 'email')
    const existingLinkedin = existing?.find((d) => d.channel === 'linkedin')

    const emailOp = existingEmail
      ? supabase
          .from('outreach_drafts')
          .update({
            subject: emailSubject,
            body: emailBody,
            tone: outreachTone,
          })
          .eq('id', existingEmail.id)
      : supabase.from('outreach_drafts').insert({
          lead_id: outreachLead.id,
          channel: 'email',
          subject: emailSubject,
          body: emailBody,
          tone: outreachTone,
        })

    const linkedinOp = existingLinkedin
      ? supabase
          .from('outreach_drafts')
          .update({
            body: linkedinMessage,
            tone: outreachTone,
          })
          .eq('id', existingLinkedin.id)
      : supabase.from('outreach_drafts').insert({
          lead_id: outreachLead.id,
          channel: 'linkedin',
          body: linkedinMessage,
          tone: outreachTone,
        })

    const [emailResult, linkedinResult] = await Promise.all([emailOp, linkedinOp])

    setOutreachSaving(false)

    if (emailResult.error || linkedinResult.error) {
      toast.error('Failed to save draft')
      return
    }

    toast.success('Draft saved')
    setOutreachOpen(false)
  }

  const handleCopyToClipboard = (text, label) => {
    if (!text) {
      toast.error(`No ${label.toLowerCase()} to copy`)
      return
    }
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const handleExportCsv = async () => {
    if (leads.length === 0) {
      toast.error('No leads to export')
      return
    }

    const leadIds = leads.map((l) => l.id)
    const { data: drafts, error } = await supabase
      .from('outreach_drafts')
      .select('*')
      .in('lead_id', leadIds)

    if (error) {
      toast.error('Failed to load drafts for export')
      return
    }

    const rows = leads.map((lead) => {
      const emailDraft = drafts?.find(
        (d) => d.lead_id === lead.id && d.channel === 'email'
      )
      const linkedinDraft = drafts?.find(
        (d) => d.lead_id === lead.id && d.channel === 'linkedin'
      )

      return {
        Name: lead.name,
        Company: lead.company || '',
        Role: lead.role || '',
        Domain: lead.domain || '',
        Email: lead.email || '',
        Score: lead.score ?? '',
        'Score Explanation': lead.score_explanation || '',
        'Enrichment Status': lead.enrichment_data
          ? lead.enrichment_data.isMock
            ? 'Mock'
            : 'Enriched'
          : 'Not enriched',
        'Email Subject': emailDraft?.subject || '',
        'Email Body': emailDraft?.body || '',
        'LinkedIn Message': linkedinDraft?.body || '',
        Source: lead.source,
      }
    })

    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `${project?.name || 'leads'}-export-${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('CSV exported')
  }

  const handleCsvUpload = () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first')
      return
    }

    setCsvUploading(true)

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const validRows = []
        const invalidRows = []
        const duplicateRows = []
        const seenInBatch = new Set()

        results.data.forEach((row, index) => {
          const name = row.name || row.Name || ''
          if (!name.trim()) {
            invalidRows.push(index + 2)
            return
          }

          const rowEmail = (row.email || row.Email || '').trim().toLowerCase()
          const rowCompany = (row.company || row.Company || '').trim().toLowerCase()
          const dedupeKey = rowEmail || `${name.trim().toLowerCase()}|${rowCompany}`

          const existsInDb = leads.some((l) => {
            const lEmail = (l.email || '').toLowerCase()
            const lKey = lEmail || `${l.name.toLowerCase()}|${(l.company || '').toLowerCase()}`
            return lKey === dedupeKey
          })

          if (existsInDb || seenInBatch.has(dedupeKey)) {
            duplicateRows.push(index + 2)
            return
          }

          seenInBatch.add(dedupeKey)
          validRows.push({
            project_id: id,
            name: name.trim(),
            company: (row.company || row.Company || '').trim() || null,
            role: (row.role || row.Role || '').trim() || null,
            domain: (row.domain || row.Domain || '').trim() || null,
            email: (row.email || row.Email || '').trim() || null,
            source: 'csv',
          })
        })

        if (validRows.length === 0) {
          setCsvUploading(false)
          if (duplicateRows.length > 0) {
            toast.warning(`All rows were duplicates or invalid. Skipped ${duplicateRows.length} duplicate(s).`)
          } else {
            toast.error('No valid rows found. Make sure your CSV has a "name" column.')
          }
          return
        }

        const BATCH_SIZE = 100
        let insertedCount = 0
        let hadError = false

        for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
          const chunk = validRows.slice(i, i + BATCH_SIZE)
          const { error } = await supabase.from('leads').insert(chunk)

          if (error) {
            hadError = true
            break
          }
          insertedCount += chunk.length
        }

        setCsvUploading(false)

        if (hadError) {
          toast.error(`Upload failed after inserting ${insertedCount} of ${validRows.length} leads. Please retry.`)
          setCsvFile(null)
          fetchLeads()
          return
        }

        const messages = [`Imported ${insertedCount} leads`]
        if (invalidRows.length > 0) {
          messages.push(`skipped ${invalidRows.length} row(s) missing a name`)
        }
        if (duplicateRows.length > 0) {
          messages.push(`skipped ${duplicateRows.length} duplicate(s)`)
        }

        if (invalidRows.length > 0 || duplicateRows.length > 0) {
          toast.warning(messages.join(', '))
        } else {
          toast.success(messages[0])
        }

        setCsvFile(null)
        fetchLeads()
      },
      error: () => {
        setCsvUploading(false)
        toast.error('Could not parse CSV file. Please check the file format.')
      },
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading project...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{project?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {project?.icp_industry} · {project?.icp_role} · {project?.icp_region}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleExportCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CRM CSV
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="ml-2 mt-3"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="add-leads">Add Leads</TabsTrigger>
            <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="add-leads" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Upload CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground">
                  CSV should include a "name" column, and optionally "company", "role", "domain", and "email".
                </p>
                <Button onClick={handleCsvUpload} disabled={csvUploading}>
                  {csvUploading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add Lead Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSubmit(onManualAdd)}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" {...register('name')} placeholder="Jane Doe" />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" {...register('company')} placeholder="Acme Inc." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" {...register('role')} placeholder="VP Sales" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain (optional)</Label>
                    <Input id="domain" {...register('domain')} placeholder="acme.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input id="email" {...register('email')} placeholder="jane@acme.com" />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">Add Lead</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-4 space-y-4">
            <InsightsPanel project={project} leads={leads} />

            {leads.length === 0 ? (
              <p className="text-muted-foreground">No leads yet.</p>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => {
                  const primaryAction = getPrimaryAction(lead)
                  return (
                    <Card key={lead.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <InitialsAvatar name={lead.name} />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-foreground">{lead.name}</p>
                                <Badge variant="secondary" className="text-[10px]">
                                  {lead.source}
                                </Badge>
                                {lead.enrichment_data && (
                                  <Badge
                                    variant={lead.enrichment_data.isMock ? 'outline' : 'default'}
                                    className="text-[10px]"
                                  >
                                    {lead.enrichment_data.isMock ? 'Mock enrichment' : 'Enriched'}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {lead.role || 'Unknown role'}
                                {lead.company && ` · ${lead.company}`}
                              </p>
                              {(lead.domain || lead.email) && (
                                <p className="text-xs text-muted-foreground">
                                  {lead.domain}
                                  {lead.domain && lead.email && ' · '}
                                  {lead.email}
                                </p>
                              )}
                            </div>
                          </div>
                          <ScoreBadge score={lead.score} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            variant={primaryAction === 'enrich' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleEnrich(lead)}
                            disabled={enrichingId === lead.id}
                          >
                            {enrichingId === lead.id ? 'Enriching...' : 'Enrich'}
                          </Button>
                          <Button
                            variant={primaryAction === 'score' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleScore(lead)}
                            disabled={scoringId === lead.id}
                          >
                            {scoringId === lead.id ? 'Scoring...' : 'Score'}
                          </Button>
                          <Button
                            variant={primaryAction === 'outreach' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => openOutreachDialog(lead)}
                          >
                            <Mail className="mr-1 h-4 w-4" />
                            Outreach
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto"
                            onClick={() => handleDeleteLead(lead.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {lead.score_explanation && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedExplanation(
                                  expandedExplanation === lead.id ? null : lead.id
                                )
                              }
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              {expandedExplanation === lead.id
                                ? 'Hide explanation'
                                : 'Why this score?'}
                            </button>
                            {expandedExplanation === lead.id && (
                              <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-2">
                                <p className="text-xs italic text-muted-foreground">
                                  {lead.score_explanation}
                                </p>
                                {lead.score_criteria && (
                                  <CriteriaChecklist criteria={lead.score_criteria} />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Outreach for {outreachLead?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Tone</Label>
                <Select value={outreachTone} onValueChange={setOutreachTone}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateOutreach}
                disabled={outreachGenerating}
                className="shrink-0"
              >
                {outreachGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="emailSubject">Email Subject</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleCopyToClipboard(emailSubject, 'Email subject')}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Input
                id="emailSubject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Generated subject will appear here"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailBody">Email Body</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('emailBody', 'shorten')}
                  disabled={rewritingField === 'emailBody'}
                >
                  Shorten
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('emailBody', 'expand')}
                  disabled={rewritingField === 'emailBody'}
                >
                  Expand
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('emailBody', 'tone')}
                  disabled={rewritingField === 'emailBody'}
                >
                  Change Tone
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyToClipboard(emailBody, 'Email body')}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Textarea
                id="emailBody"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                placeholder="Generated email will appear here"
                className="w-full resize-y"
              />
              {rewritingField === 'emailBody' && (
                <p className="text-xs text-muted-foreground">Rewriting...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinMessage">LinkedIn Message</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('linkedinMessage', 'shorten')}
                  disabled={rewritingField === 'linkedinMessage'}
                >
                  Shorten
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('linkedinMessage', 'expand')}
                  disabled={rewritingField === 'linkedinMessage'}
                >
                  Expand
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRewrite('linkedinMessage', 'tone')}
                  disabled={rewritingField === 'linkedinMessage'}
                >
                  Change Tone
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleCopyToClipboard(linkedinMessage, 'LinkedIn message')
                  }
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
              <Textarea
                id="linkedinMessage"
                value={linkedinMessage}
                onChange={(e) => setLinkedinMessage(e.target.value)}
                rows={4}
                placeholder="Generated LinkedIn message will appear here"
                className="w-full resize-y"
              />
              {rewritingField === 'linkedinMessage' && (
                <p className="text-xs text-muted-foreground">Rewriting...</p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button onClick={handleSaveOutreach} disabled={outreachSaving}>
              {outreachSaving ? 'Saving...' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProjectDetail