import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/lib/AuthContext'
import { useDarkMode } from '@/hooks/useDarkMode'
import { demoProject, demoLeads, demoOutreach } from '@/lib/demoData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ScoreBadge from '@/components/ScoreBadge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Trash2,
  Pencil,
  Sparkles,
  LogOut,
  FolderKanban,
  Users,
  TrendingUp,
  Mail,
  Sun,
  Moon,
} from 'lucide-react'

function Dashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useDarkMode()

  const [projects, setProjects] = useState([])
  const [projectStats, setProjectStats] = useState({})
  const [kpis, setKpis] = useState({
    projectsCount: 0,
    leadsCount: 0,
    avgScore: null,
    emailsCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    icp_industry: '',
    icp_company_size: '',
    icp_role: '',
    icp_region: '',
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectsError) {
      toast.error('Failed to load projects')
      setLoading(false)
      return
    }

    setProjects(projectsData)

    if (projectsData.length === 0) {
      setKpis({ projectsCount: 0, leadsCount: 0, avgScore: null, emailsCount: 0 })
      setProjectStats({})
      setLoading(false)
      return
    }

    const projectIds = projectsData.map((p) => p.id)

    const [leadsResult, emailsResult] = await Promise.all([
      supabase
        .from('leads')
        .select('project_id, score, enrichment_data, created_at')
        .in('project_id', projectIds),
      supabase
        .from('outreach_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('channel', 'email'),
    ])

    const allLeads = leadsResult.data || []
    const emailsCount = emailsResult.count || 0

    const stats = {}
    projectIds.forEach((pid) => {
      stats[pid] = { leadCount: 0, scoreSum: 0, scoreCount: 0, enrichedCount: 0, lastActivity: null }
    })

    let totalScoreSum = 0
    let totalScoreCount = 0

    allLeads.forEach((lead) => {
      const s = stats[lead.project_id]
      if (!s) return
      s.leadCount += 1
      if (typeof lead.score === 'number') {
        s.scoreSum += lead.score
        s.scoreCount += 1
        totalScoreSum += lead.score
        totalScoreCount += 1
      }
      if (lead.enrichment_data && !lead.enrichment_data.isMock) {
        s.enrichedCount += 1
      }
      if (!s.lastActivity || new Date(lead.created_at) > new Date(s.lastActivity)) {
        s.lastActivity = lead.created_at
      }
    })

    Object.keys(stats).forEach((pid) => {
      stats[pid].avgScore = stats[pid].scoreCount > 0 ? Math.round(stats[pid].scoreSum / stats[pid].scoreCount) : null
    })

    setProjectStats(stats)
    setKpis({
      projectsCount: projectsData.length,
      leadsCount: allLeads.length,
      avgScore: totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : null,
      emailsCount,
    })

    setLoading(false)
  }

  const openCreateDialog = () => {
    setEditingProject(null)
    setFormData({
      name: '',
      icp_industry: '',
      icp_company_size: '',
      icp_role: '',
      icp_region: '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (project) => {
    setEditingProject(project)
    setFormData({
      name: project.name || '',
      icp_industry: project.icp_industry || '',
      icp_company_size: project.icp_company_size || '',
      icp_role: project.icp_role || '',
      icp_region: project.icp_region || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    if (editingProject) {
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', editingProject.id)

      if (error) {
        toast.error('Failed to update project')
        return
      }
      toast.success('Project updated')
    } else {
      const { error } = await supabase
        .from('projects')
        .insert({ ...formData, user_id: session.user.id })

      if (error) {
        toast.error('Failed to create project')
        return
      }
      toast.success('Project created')
    }

    setDialogOpen(false)
    fetchDashboardData()
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)

    if (error) {
      toast.error('Failed to delete project')
      return
    }

    toast.success('Project deleted')
    fetchDashboardData()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleLoadDemo = async () => {
    const toastId = toast.loading('Loading demo project...')

    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({ ...demoProject, user_id: session.user.id })
        .select()
        .single()

      if (projectError) throw projectError

      const leadsToInsert = demoLeads.map((lead) => ({
        project_id: project.id,
        name: lead.name,
        company: lead.company,
        role: lead.role,
        domain: lead.domain,
        email: lead.email,
        source: lead.source,
        score: lead.score,
        score_explanation: lead.score_explanation,
        enrichment_data: lead.enrichment_data,
      }))

      const { data: insertedLeads, error: leadsError } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select()

      if (leadsError) throw leadsError

      const draftsToInsert = []
      for (const lead of insertedLeads) {
        const draft = demoOutreach[lead.name]
        if (draft) {
          draftsToInsert.push({
            lead_id: lead.id,
            channel: 'email',
            subject: draft.email.subject,
            body: draft.email.body,
            tone: draft.tone,
          })
          draftsToInsert.push({
            lead_id: lead.id,
            channel: 'linkedin',
            body: draft.linkedin,
            tone: draft.tone,
          })
        }
      }

      if (draftsToInsert.length > 0) {
        const { error: draftsError } = await supabase
          .from('outreach_drafts')
          .insert(draftsToInsert)

        if (draftsError) throw draftsError
      }

      toast.success(
        `Demo loaded! ${insertedLeads.length} sample leads ready — already scored, enriched, and two have outreach drafts.`,
        { id: toastId, duration: 5000 }
      )
      fetchDashboardData()
      navigate(`/project/${project.id}`)
    } catch (err) {
      toast.error('Failed to load demo project: ' + err.message, { id: toastId })
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ProspectIQ</h1>
            <p className="text-sm text-muted-foreground">Manage your lead-gen campaigns</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDark(!isDark)}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {isDark ? 'Light' : 'Dark'}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderKanban className="h-4 w-4" />
                <span className="text-xs">Projects</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading ? '—' : kpis.projectsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-xs">Leads Processed</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading ? '—' : kpis.leadsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Avg Lead Score</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading ? '—' : kpis.avgScore ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="text-xs">Emails Generated</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {loading ? '—' : kpis.emailsCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={<Button onClick={openCreateDialog}>+ New Project</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? 'Edit Project' : 'Create Project'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Q3 SaaS Outreach"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icp_industry">ICP: Industry</Label>
                  <Input
                    id="icp_industry"
                    value={formData.icp_industry}
                    onChange={(e) =>
                      setFormData({ ...formData, icp_industry: e.target.value })
                    }
                    placeholder="e.g. B2B SaaS"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icp_company_size">ICP: Company Size</Label>
                  <Input
                    id="icp_company_size"
                    value={formData.icp_company_size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        icp_company_size: e.target.value,
                      })
                    }
                    placeholder="e.g. 11-50 employees"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icp_role">ICP: Role</Label>
                  <Input
                    id="icp_role"
                    value={formData.icp_role}
                    onChange={(e) =>
                      setFormData({ ...formData, icp_role: e.target.value })
                    }
                    placeholder="e.g. VP of Marketing"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icp_region">ICP: Region</Label>
                  <Input
                    id="icp_region"
                    value={formData.icp_region}
                    onChange={(e) =>
                      setFormData({ ...formData, icp_region: e.target.value })
                    }
                    placeholder="e.g. North America"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleSave}>
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="secondary" onClick={handleLoadDemo}>
            <Sparkles className="mr-2 h-4 w-4" />
            Load Demo Project
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground">
            No projects yet. Create one to get started, or load the demo project.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const stats = projectStats[project.id]
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="truncate">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {project.icp_industry && <p>Industry: {project.icp_industry}</p>}
                    {project.icp_role && <p>Role: {project.icp_role}</p>}
                    <div className="grid grid-cols-2 gap-y-1 border-t pt-2 text-xs">
                      <div>
                        <span className="font-medium text-foreground">
                          {stats?.leadCount ?? 0}
                        </span>{' '}
                        Leads
                      </div>
                      <div className="flex items-center gap-1">
                        Avg: <ScoreBadge score={stats?.avgScore ?? null} size="sm" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground">
                          {stats?.enrichedCount ?? 0}
                        </span>{' '}
                        Enriched
                      </div>
                      <div>
                        {stats?.lastActivity
                          ? new Date(stats.lastActivity).toLocaleDateString()
                          : 'No activity yet'}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/project/${project.id}`)}
                    >
                      Open
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(project)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard