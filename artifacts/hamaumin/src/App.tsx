import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  Activity, AlertCircle, ArrowLeft, ArrowUpRight, Bot, Box, Check, CheckCircle2,
  Circle, Code2, Command, Cpu, Database, FileCode2, FolderKanban, Gauge,
  HardDrive, KeyRound, LayoutDashboard, LockKeyhole, Menu, MessageCircle, MoreHorizontal,
  Palette, Plus, RefreshCw, RotateCcw, Save, Send, Settings2, ShieldCheck,
  Sparkles, Square, Trash2, UserRound, Wrench, X, Zap,
} from 'lucide-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  getGetProjectQueryKey, getGetSettingsQueryKey, getListConversationsQueryKey,
  getListMemoriesQueryKey, getListMessagesQueryKey, getListProjectsQueryKey, getListTasksQueryKey,
  getListThemesQueryKey, useApplyTheme, useCancelTask, useCreateConversation,
  useCreateMemory, useCreateProject, useCreateTask, useCreateTheme, useDeleteMemory, useDeleteTheme,
  useGetDashboard, useGetProject, useGetSettings, useListConversations, useListMemories,
  useListMessages, useListProjects, useListTasks, useListThemes, useListTools, useRetryTask,
  useSendMessage, useUpdateMemory, useUpdateSettings, useUpdateTask, useUpdateTheme,
} from '@workspace/api-client-react';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#a978f2',
    colorForeground: '#f4effb',
    colorMutedForeground: '#a89eb8',
    colorDanger: '#f47772',
    colorBackground: '#1b1525',
    colorInput: '#100c18',
    colorInputForeground: '#f4effb',
    colorNeutral: '#3b3048',
    fontFamily: "'Noto Sans Arabic', ui-sans-serif, sans-serif",
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#1b1525] rounded-3xl w-[440px] max-w-full overflow-hidden',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f4effb]',
    headerSubtitle: 'text-[#a89eb8]',
    socialButtonsBlockButtonText: 'text-[#f4effb]',
    formFieldLabel: 'text-[#dcd3e8]',
    footerActionLink: 'text-[#a978f2]',
    footerActionText: 'text-[#a89eb8]',
    dividerText: 'text-[#a89eb8]',
    formFieldInput: 'bg-[#100c18] text-[#f4effb] border-[#3b3048]',
    socialButtonsBlockButton: 'border-[#3b3048] bg-[#241b31]',
    formButtonPrimary: 'bg-[#f4a34d] text-[#18121f] hover:bg-[#ffc071]',
    dividerLine: 'bg-[#3b3048]',
    alertText: 'text-[#f47772]',
  },
};
const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const formatDate = (date?: string) => date ? new Intl.DateTimeFormat('ku', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date)) : '—';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'کێشەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەرەوە.';
const hexToHsl = (hex: string) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255, g = parseInt(value.slice(2, 4), 16) / 255, b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min; s = l > .5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

function IconButton({ label, children, onClick, className = '', type = 'button' }: { label: string; children: ReactNode; onClick?: () => void; className?: string; type?: 'button' | 'submit' }) {
  return <button type={type} aria-label={label} data-testid={`button-${label}`} onClick={onClick} className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-secondary/60 text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary/70 hover:text-foreground', className)}>{children}</button>;
}
function Button({ children, onClick, type = 'button', variant = 'primary', className = '', disabled = false }: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; variant?: 'primary' | 'ghost' | 'soft' | 'danger'; className?: string; disabled?: boolean }) {
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={`button-${typeof children === 'string' ? children : variant}`} className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50', variant === 'primary' && 'bg-accent text-accent-foreground shadow-lg shadow-orange-950/20 hover:bg-[hsl(32_94%_65%)]', variant === 'soft' && 'bg-primary/15 text-violet-2 hover:bg-primary/25', variant === 'danger' && 'bg-destructive/12 text-destructive hover:bg-destructive/20', variant === 'ghost' && 'border border-border bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground', className)}>{children}</button>;
}
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'violet' }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', tone === 'success' && 'border-green-400/20 bg-green-400/10 text-[hsl(var(--success))]', tone === 'warning' && 'border-orange-300/20 bg-orange-300/10 text-[hsl(var(--warning))]', tone === 'danger' && 'border-red-400/20 bg-red-400/10 text-destructive', tone === 'violet' && 'border-primary/25 bg-primary/10 text-violet-2', tone === 'neutral' && 'border-border bg-secondary text-muted-foreground')}>{children}</span>;
}
function Empty({ icon: Icon, title, detail, action }: { icon: typeof Box; title: string; detail: string; action?: ReactNode }) {
  return <div className="glass flex min-h-64 flex-col items-center justify-center rounded-2xl border-dashed px-6 text-center"><div className="mb-4 rounded-2xl bg-primary/12 p-3 text-primary"><Icon size={22} /></div><h3 className="text-base font-bold">{title}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
function QueryState({ loading, error, children }: { loading?: boolean; error?: unknown; children: ReactNode }) {
  if (loading) return <div className="grid gap-3 md:grid-cols-2"><div className="h-32 animate-pulse rounded-2xl bg-secondary/70" /><div className="h-32 animate-pulse rounded-2xl bg-secondary/50" /></div>;
  if (error) return <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6 text-sm text-destructive"><AlertCircle className="mb-2" size={20} /><p>{errorText(error)}</p><Button variant="danger" className="mt-4" onClick={() => window.location.reload()}><RefreshCw size={15} /> دووبارە هەوڵ بدەرەوە</Button></div>;
  return <>{children}</>;
}

const navItems = [
  { href: '/', label: 'سەرەتا', icon: LayoutDashboard },
  { href: '/tasks', label: 'ئەرکەکان', icon: Activity },
  { href: '/projects', label: 'پڕۆژەکان', icon: Code2 },
  { href: '/tools', label: 'ئامرازەکان', icon: Wrench },
  { href: '/memory', label: 'بیرگە', icon: Database },
];
function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  return <div className="app-noise min-h-[100dvh]"><aside className={cn('fixed inset-y-0 right-0 z-40 flex w-[256px] flex-col border-l border-border bg-[hsl(258_34%_7%_/_0.92)] p-5 backdrop-blur-xl transition-transform md:left-0 md:right-auto md:border-l-0 md:border-r md:translate-x-0', mobileOpen ? 'translate-x-0' : 'translate-x-full')} dir="rtl">
    <div className="mb-10 flex items-center justify-between"><Link href="/" data-testid="link-brand" className="flex items-center gap-3"><span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-violet-950/30"><Sparkles size={19} /><span className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-accent" /></span><span><strong className="block text-[17px] tracking-tight">HAMAUMIN</strong><small className="block text-[10px] text-muted-foreground">هاوڕێی بیر و کار</small></span></Link><IconButton label="داخستنی مێنیو" className="md:hidden" onClick={() => setMobileOpen(false)}><X size={17} /></IconButton></div>
    <div className="mb-3 px-3 kicker">شوێنی کار</div>
    <nav className="space-y-1">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} data-testid={`link-nav-${label}`} onClick={() => setMobileOpen(false)} className={cn('group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition', (location === href || (href !== '/' && location.startsWith(href))) ? 'bg-primary/15 font-bold text-violet-2' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><Icon size={18} /><span>{label}</span>{(location === href || (href !== '/' && location.startsWith(href))) && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-accent" />}</Link>)}</nav>
    <div className="mt-8 px-3 mb-3 kicker">سیستەم</div><nav className="space-y-1"><Link href="/settings" data-testid="link-nav-settings" className={cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition', location.startsWith('/settings') ? 'bg-secondary font-bold text-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><Settings2 size={18} /> ڕێکخستنەکان</Link></nav>
    <div className="mt-auto rounded-2xl border border-primary/15 bg-primary/8 p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">هێزی مۆدێل</span><Badge tone="success"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" /> چالاک</Badge></div><p className="text-xs leading-6 text-muted-foreground">HAMAUMIN لەگەڵ تۆیە، بە زمانی خۆت.</p></div>
  </aside><div className="md:pl-[256px] md:pr-0"><header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/70 bg-[hsl(258_34%_7%_/_0.78)] px-4 backdrop-blur-xl md:px-8" dir="rtl"><div className="flex items-center gap-3"><IconButton label="کردنەوەی مێنیو" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></IconButton><div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><Command size={14} /> <span>گەڕان</span><kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">⌘ K</kbd></div><span className="text-sm font-semibold md:hidden">HAMAUMIN</span></div><div className="flex items-center gap-2"><IconButton label="ئاگادارییەکان"><BellIcon /></IconButton><Link href="/settings" data-testid="link-profile" className="flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-2 py-1.5 text-right hover:bg-secondary"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-2 text-xs font-bold text-primary-foreground">هـ</span><span className="hidden text-xs md:block"><strong className="block">بەکارهێنەر</strong><small className="text-muted-foreground">پلانی تایبەت</small></span></Link></div></header><main className="mx-auto max-w-[1480px] p-4 md:p-8">{children}</main></div></div>;
}
function BellIcon() { return <Activity size={17} />; }
function PageHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between" dir="rtl"><div><div className="kicker mb-3">{eyebrow}</div><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>{detail && <p className="mt-2 text-sm text-muted-foreground">{detail}</p>}</div>{action}</div>;
}

function Home() {
  const { data, isLoading, error } = useGetDashboard();
  const conversations = useListConversations();
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const activeId = conversationId ?? conversations.data?.[0]?.id ?? null;
  const messages = useListMessages(activeId ?? 0, { query: { enabled: !!activeId, queryKey: getListMessagesQueryKey(activeId ?? 0) } });
  const [creating, setCreating] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sendMessage.isPending) return;
    let id = activeId;
    if (!id) {
      const created = await createConversation.mutateAsync({ data: { title: draft.slice(0, 38) } });
      id = created.id;
      setConversationId(id);
    }
    const content = draft.trim();
    setDraft('');
    await sendMessage.mutateAsync({ conversationId: id, data: { content } });
    qc.invalidateQueries({ queryKey: getListMessagesQueryKey(id) });
    qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  };
  const startConversation = async () => {
    setCreating(true);
    try {
      const c = await createConversation.mutateAsync({ data: { title: 'گفتوگۆی نوێ' } });
      setConversationId(c.id);
    } finally { setCreating(false); }
  };
  const statItems = [
    ['ئەرکەکان', data?.stats.tasks ?? 0, Activity],
    ['پڕۆژەکان', data?.stats.projects ?? 0, Code2],
    ['بیرەکان', data?.stats.memories ?? 0, Database],
    ['ئامرازەکان', data?.stats.tools ?? 0, Wrench],
  ] as const;
  return <div className="page-enter" dir="rtl">
    <PageHeading eyebrow="ئێستا لەگەڵ تۆ" title={data?.greeting ?? 'بەخێربێیت، هاوڕێ'} detail="شوێنێکی ئارام بۆ بیرکردنەوە، دروستکردن و بەڕێوەبردنی کارەکانت." action={<Button onClick={startConversation} disabled={creating}><Plus size={16} /> گفتوگۆی نوێ</Button>} />
    <QueryState loading={isLoading} error={error}>
      <div className="grid gap-4 md:grid-cols-4">{statItems.map(([label, value, Icon], i) => <div key={label} className={cn('glass rise rounded-2xl p-5', `delay-${i + 1}`)}><div className="mb-6 flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><span className="rounded-xl bg-primary/12 p-2.5 text-primary"><Icon size={18} /></span></div><strong className="font-mono text-3xl">{value}</strong><span className="mr-2 text-xs text-muted-foreground">ئەم هەفتەیە</span></div>)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
        <section className="glass flex min-h-[560px] flex-col overflow-hidden rounded-3xl">
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Bot size={18} /></div><div><h2 className="text-sm font-bold">هاوڕێی HAMAUMIN</h2><div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--success))]"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" /> ئامادەیە بۆ یارمەتیدان</div></div></div><IconButton label="هەڵبژاردنی مۆدێل"><MoreHorizontal size={18} /></IconButton></div>
          <div className="scroll-thin flex-1 space-y-5 overflow-auto p-5">
            {!activeId ? <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center"><div className="relative mb-7 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-primary/25 bg-primary/10 text-primary shadow-2xl shadow-violet-950/25"><Sparkles size={36} /><span className="absolute -right-1 top-1 h-3 w-3 rounded-full bg-accent" /></div><h2 className="text-xl font-extrabold">چی دەتەوێت پێکەوە بکەین؟</h2><p className="mt-2 max-w-sm text-sm leading-7 text-muted-foreground">بە سۆرانی بنووسە. لە پلاندانانەوە تا کۆدنووسین، من لەگەڵتم.</p><div className="mt-6 flex flex-wrap justify-center gap-2">{['پلانێکی هەفتانە بۆم دابنێ', 'پڕۆژەیەکی نوێ دروست بکە', 'بیرەکانم ڕێکبخە'].map((x) => <button key={x} onClick={() => setDraft(x)} data-testid={`button-suggestion-${x}`} className="rounded-xl border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground">{x}</button>)}</div></div> : <>{(messages.data ?? []).map((m) => <div key={m.id} data-testid={`message-${m.id}`} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}><div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold', m.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')}>{m.role === 'user' ? 'تۆ' : 'هـ'}</div><div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-7', m.role === 'user' ? 'rounded-tr-md bg-accent/12' : 'rounded-tl-md bg-secondary')}><p>{m.content}</p><span className="mt-2 block text-[10px] text-muted-foreground">{formatDate(m.createdAt)}</span></div></div>)}{sendMessage.isPending && <div className="flex gap-3"><div className="h-8 w-8 rounded-xl bg-primary/60" /><div className="rounded-2xl rounded-tl-md bg-secondary px-4 py-3 text-xs text-muted-foreground">بیر دەکەمەوە...</div></div>}</>}</div>
          <form onSubmit={submit} className="border-t border-border/70 p-4"><div className="flex items-end gap-2 rounded-2xl border border-border bg-background/60 p-2 transition focus-within:border-primary/70"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="input-chat-message" rows={2} placeholder="پرسیارەکەت بە سۆرانی بنووسە..." className="min-h-[54px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground" /><Button type="submit" disabled={!draft.trim() || sendMessage.isPending} className="h-11 w-11 shrink-0 rounded-xl p-0"><Send size={17} /></Button></div><div className="mt-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground"><span>Enter بۆ ناردن</span><span>HAMAUMIN · Terra 5.6</span></div></form>
        </section>
        <aside className="space-y-5"><div className="glass rounded-3xl p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">ئەرکی ئێستا</h2><Link href="/tasks" data-testid="link-current-tasks" className="text-xs text-primary hover:underline">هەمووی ببینە</Link></div>{data?.currentTask ? <TaskMini task={data.currentTask} /> : <Empty icon={Zap} title="هیچ ئەرکێک نییە" detail="ئەرکێک بدە بە HAMAUMIN تا بەدوایدا بچێت." action={<Link href="/tasks" data-testid="link-create-task-empty" className="text-xs text-primary">ئەرکێکی نوێ زیاد بکە</Link>} />}</div><div className="glass rounded-3xl p-5"><h2 className="mb-4 font-bold">دواین چالاکییەکان</h2><div className="space-y-4">{(data?.recentActivity ?? []).slice(0, 5).map((a, i) => <div key={`${a}-${i}`} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><p>{a}</p><span className="text-[11px] text-muted-foreground">{i + 1} کاتژمێر لەمەوبەر</span></div></div>)}</div></div></aside>
      </div>
    </QueryState>
  </div>;
}
function TaskMini({ task }: { task: any }) { return <Link href={`/tasks/${task.id}`} data-testid={`card-current-task-${task.id}`} className="block rounded-2xl border border-border bg-secondary/55 p-4 transition hover:-translate-y-0.5 hover:border-primary/50"><div className="mb-3 flex items-start justify-between gap-3"><h3 className="text-sm font-bold leading-6">{task.title}</h3><Badge tone={task.status === 'Failed' ? 'danger' : task.status === 'Completed' ? 'success' : 'violet'}>{task.status}</Badge></div><div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>پێشکەوتن</span><span className="font-mono text-foreground">{task.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-l from-accent to-primary" style={{ width: `${task.progress}%` }} /></div></Link>; }

function Tasks() {
  const tasks = useListTasks();
  const create = useCreateTask(); const update = useUpdateTask(); const retry = useRetryTask(); const cancel = useCancelTask(); const qc = useQueryClient();
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [priority, setPriority] = useState('Medium');
  const refresh = () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!title.trim()) return; await create.mutateAsync({ data: { title, description, priority: priority as 'Low' | 'Medium' | 'High' } }); setTitle(''); setDescription(''); setOpen(false); refresh(); };
  return <div className="page-enter" dir="rtl"><PageHeading eyebrow="وەشانی کار" title="ئەرکەکان" detail="هەموو ئەو شتانەی HAMAUMIN بۆت بەدواداچوونیان دەکات." action={<Button onClick={() => setOpen(!open)}><Plus size={16} /> ئەرکی نوێ</Button>} />{open && <form onSubmit={submit} className="glass mb-5 grid gap-4 rounded-2xl p-5 md:grid-cols-[1.2fr_1.2fr_.6fr_auto] md:items-end"><Field label="ناونیشان"><input data-testid="input-task-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="نمونە: ڕێکخستنی پلانی مانگ" className="field" autoFocus /></Field><Field label="وردەکاری"><input data-testid="input-task-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="ئەم ئەرکە چییە؟" className="field" /></Field><Field label="گرنگی"><select data-testid="select-task-priority" value={priority} onChange={e => setPriority(e.target.value)} className="field"><option>Low</option><option>Medium</option><option>High</option></select></Field><Button type="submit" disabled={create.isPending}><Save size={16} /> پاشەکەوت</Button></form>}<QueryState loading={tasks.isLoading} error={tasks.error}>{!tasks.data?.length ? <Empty icon={Activity} title="ئەرکەکانت لێرە دەردەکەون" detail="یەکەم ئەرک دروست بکە و بهێڵە HAMAUMIN بە هێمنی بەڕێوەی ببەن." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> دەستپێبکە</Button>} /> : <div className="grid gap-4 lg:grid-cols-2">{tasks.data.map((task) => <div key={task.id} data-testid={`card-task-${task.id}`} className="glass rounded-2xl p-5 transition hover:-translate-y-1 hover:border-primary/45"><div className="mb-4 flex items-start justify-between gap-3"><Link href={`/tasks/${task.id}`} data-testid={`link-task-${task.id}`} className="min-w-0"><h2 className="font-bold leading-7 hover:text-primary">{task.title}</h2><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description || 'وردەکاری نییە'}</p></Link><Badge tone={task.status === 'Failed' ? 'danger' : task.status === 'Completed' ? 'success' : task.status === 'Cancelled' ? 'danger' : 'violet'}>{task.status}</Badge></div><div className="mb-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">هەنگاوی {Math.min((task.currentStep ?? 0) + 1, task.steps?.length || 1)} لە {task.steps?.length || 1}</span><span className="font-mono text-primary">{task.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-l from-accent to-primary transition-all" style={{ width: `${task.progress}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4"><span className="text-xs text-muted-foreground">{task.priority} · {formatDate(task.updatedAt)}</span><div className="flex gap-2">{task.status === 'Failed' && <IconButton label={`دووبارەکردنەوەی ئەرک ${task.id}`} onClick={() => retry.mutate({ taskId: task.id }, { onSuccess: refresh })}><RotateCcw size={15} /></IconButton>}{!['Completed', 'Cancelled', 'Failed'].includes(task.status) && <IconButton label={`هەڵوەشاندنەوەی ئەرک ${task.id}`} onClick={() => cancel.mutate({ taskId: task.id }, { onSuccess: refresh })}><Square size={14} /></IconButton>}<select aria-label={`گۆڕینی دۆخی ئەرک ${task.id}`} data-testid={`select-task-status-${task.id}`} value={task.status} onChange={e => update.mutate({ taskId: task.id, data: { status: e.target.value as any } }, { onSuccess: refresh })} className="rounded-lg border border-border bg-secondary px-2 text-[11px] text-muted-foreground"><option>New</option><option>Planning</option><option>In Progress</option><option>Waiting</option><option>Completed</option><option>Failed</option><option>Cancelled</option></select></div></div></div>)}</div>}</QueryState></div>;
}
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-right"><span className="mb-2 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>; }

function TaskDetail() {
  const { id } = useParams<{ id: string }>(); const taskId = Number(id); const tasks = useListTasks(); const task = tasks.data?.find(x => x.id === taskId);
  const retry = useRetryTask(); const cancel = useCancelTask(); const qc = useQueryClient();
  if (tasks.isLoading) return <div className="page-enter"><SkeletonDetail /></div>;
  if (tasks.error || !task) return <QueryState error={tasks.error ?? new Error('ئەم ئەرکە نەدۆزرایەوە')}><div /></QueryState>;
  const refresh = () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
  return <div className="page-enter" dir="rtl"><Link href="/tasks" data-testid="link-back-tasks" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> گەڕانەوە بۆ ئەرکەکان</Link><PageHeading eyebrow="شوێنکەوتنی زیندوو" title={task.title} detail={task.description} action={<div className="flex gap-2">{task.status === 'Failed' && <Button variant="soft" onClick={() => retry.mutate({ taskId }, { onSuccess: refresh })}><RotateCcw size={15} /> دووبارە هەوڵ بدەرەوە</Button>}{!['Completed', 'Cancelled'].includes(task.status) && <Button variant="danger" onClick={() => cancel.mutate({ taskId }, { onSuccess: refresh })}><Square size={14} /> وەستاندن</Button>}</div>} /><div className="grid gap-5 lg:grid-cols-[1fr_.65fr]"><section className="glass rounded-3xl p-6"><div className="mb-8 flex items-center justify-between"><h2 className="font-bold">ڕێڕەوی جێبەجێکردن</h2><Badge tone={task.status === 'Failed' ? 'danger' : task.status === 'Completed' ? 'success' : 'violet'}>{task.status}</Badge></div><div className="space-y-1">{(task.steps ?? []).map((step, i) => { const done = i < task.currentStep || task.status === 'Completed'; const current = i === task.currentStep && !done; return <div key={`${step}-${i}`} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">{done ? <Check size={15} className="text-[hsl(var(--success))]" /> : current ? <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-accent" /> : <Circle size={14} className="text-muted-foreground" />}</div>{i < (task.steps?.length ?? 0) - 1 && <span className={cn('absolute right-[15px] top-8 h-full w-px', done ? 'bg-[hsl(var(--success))]/45' : 'bg-border')} /> }<div><p className={cn('text-sm font-semibold', done && 'text-[hsl(var(--success))]', current && 'text-accent')}>{step}</p><p className="mt-1 text-xs text-muted-foreground">{done ? 'تەواو کرا' : current ? 'لە ئێستادا جێبەجێ دەکرێت' : 'چاوەڕوانە'}</p></div></div>; })}</div></section><aside className="space-y-5"><div className="glass rounded-3xl p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">کورتەی ئەرک</h2><Gauge size={18} className="text-accent" /></div><div className="mb-5 flex items-end gap-2"><strong className="font-mono text-5xl">{task.progress}</strong><span className="mb-2 text-muted-foreground">%</span></div><div className="h-2 rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-l from-accent to-primary" style={{ width: `${task.progress}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><Stat label="گرنگی" value={task.priority} /><Stat label="دروستکراوە" value={formatDate(task.createdAt)} /></div></div>{task.errors?.length > 0 && <div className="rounded-3xl border border-destructive/25 bg-destructive/10 p-6"><div className="mb-4 flex items-center gap-2 font-bold text-destructive"><AlertCircle size={17} /> هەڵەکان</div>{task.errors.map((e, i) => <p key={`${e}-${i}`} className="border-t border-destructive/15 py-3 text-sm leading-6 text-destructive/90">{e}</p>)}</div>}</aside></div></div>;
}
function Stat({ label, value }: { label: string; value: ReactNode }) { return <div className="rounded-xl bg-secondary/70 p-3"><span className="block text-muted-foreground">{label}</span><strong className="mt-1 block text-foreground">{value}</strong></div>; }
function SkeletonDetail() { return <div className="space-y-4"><div className="h-5 w-32 animate-pulse rounded bg-secondary" /><div className="h-12 w-1/2 animate-pulse rounded bg-secondary" /><div className="h-72 animate-pulse rounded-3xl bg-secondary" /></div>; }

function Projects() {
  const projects = useListProjects(); const create = useCreateProject(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!name.trim()) return; await create.mutateAsync({ data: { name, description } }); setName(''); setDescription(''); setOpen(false); qc.invalidateQueries({ queryKey: getListProjectsQueryKey() }); };
  return <div className="page-enter" dir="rtl"><PageHeading eyebrow="ستۆدیۆی دروستکردن" title="پڕۆژەکان" detail="لە بیرۆکەوە تا کۆدی کارا، هەموو شتێک لە یەک شوێن." action={<Button onClick={() => setOpen(!open)}><Plus size={16} /> پڕۆژەی نوێ</Button>} />{open && <form onSubmit={submit} className="glass mb-5 grid gap-4 rounded-2xl p-5 md:grid-cols-[1fr_1.5fr_auto] md:items-end"><Field label="ناوی پڕۆژە"><input data-testid="input-project-name" value={name} onChange={e => setName(e.target.value)} placeholder="نمونە: بازاڕی ناوخۆ" className="field" /></Field><Field label="باسێکی کورت"><input data-testid="input-project-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="ئەم پڕۆژەیە بۆ چییە؟" className="field" /></Field><Button type="submit" disabled={create.isPending}><Save size={16} /> دروستکردن</Button></form>}<QueryState loading={projects.isLoading} error={projects.error}>{!projects.data?.length ? <Empty icon={Code2} title="ستۆدیۆکەت بەتاڵە" detail="پڕۆژەیەکی نوێ دروست بکە بۆ ئەوەی بیرۆکەکەت بگۆڕیت بە شتێکی ڕاستەقینە." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> یەکەم پڕۆژە</Button>} /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{projects.data.map((p) => <Link href={`/projects/${p.id}`} key={p.id} data-testid={`card-project-${p.id}`} className="glass group rounded-3xl p-5 transition hover:-translate-y-1 hover:border-primary/55"><div className="mb-7 flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/15 text-primary"><FolderKanban size={21} /></div><Badge tone={p.buildStatus === 'Ready' ? 'success' : p.buildStatus === 'Failed' ? 'danger' : p.buildStatus === 'Building' ? 'warning' : 'neutral'}>{p.buildStatus}</Badge></div><h2 className="text-lg font-bold group-hover:text-violet-2">{p.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{p.description || 'بێ باسکردن'}</p><div className="mt-5 flex items-center justify-between text-xs text-muted-foreground"><span>{p.files?.length ?? 0} فایل · {p.taskCount} ئەرک</span><ArrowUpRight size={15} className="transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent" /></div><div className="mt-4 h-1.5 rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-l from-accent to-primary" style={{ width: `${p.progress}%` }} /></div></Link>)}</div>}</QueryState></div>;
}
function ProjectDetail() {
  const { id } = useParams<{ id: string }>(); const project = useGetProject(Number(id), { query: { enabled: !!id, queryKey: getGetProjectQueryKey(Number(id)) } });
  return <div className="page-enter" dir="rtl"><Link href="/projects" data-testid="link-back-projects" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> هەموو پڕۆژەکان</Link><QueryState loading={project.isLoading} error={project.error}>{project.data && <><PageHeading eyebrow="پڕۆژە" title={project.data.name} detail={project.data.description} action={<Button variant="soft"><Code2 size={16} /> دەستپێکردنی کۆد</Button>} /><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="glass rounded-3xl p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">فایلەکان</h2><Button variant="ghost"><Plus size={15} /> فایل</Button></div>{project.data.files?.length ? <div className="space-y-2">{project.data.files.map((file) => <div key={file} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/45 px-4 py-3 text-sm"><FileCode2 size={16} className="text-primary" /><span className="font-mono text-xs">{file}</span><MoreHorizontal size={15} className="mr-auto text-muted-foreground" /></div>)}</div> : <Empty icon={FileCode2} title="هێشتا فایلێک نییە" detail="HAMAUMIN دەتوانێت بنەمای کۆدەکەت بۆ دروست بکات." />}</div><div className="space-y-5"><div className="glass rounded-3xl p-6"><h2 className="mb-5 font-bold">دۆخی پڕۆژە</h2><div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">پێشکەوتن</span><b className="font-mono">{project.data.progress}%</b></div><div className="h-2 rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-l from-accent to-primary" style={{ width: `${project.data.progress}%` }} /></div><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="ئەرکەکان" value={project.data.taskCount} /><Stat label="دواین چالاکی" value={formatDate(project.data.lastActivity)} /></div></div><div className="glass rounded-3xl p-6"><h2 className="mb-4 font-bold">هەڵەکان</h2>{project.data.errors?.length ? project.data.errors.map(e => <p key={e} className="border-t border-border py-3 text-sm text-destructive">{e}</p>) : <p className="flex items-center gap-2 text-sm text-[hsl(var(--success))]"><CheckCircle2 size={16} /> هیچ هەڵەیەک نییە</p>}</div></div></div></>}</QueryState></div>;
}

function Tools() {
  const tools = useListTools(); const [filter, setFilter] = useState('هەموو');
  const cats = ['هەموو', ...new Set((tools.data ?? []).map(t => t.category))]; const shown = tools.data?.filter(t => filter === 'هەموو' || t.category === filter);
  return <div className="page-enter" dir="rtl"><PageHeading eyebrow="کۆنترۆڵی سیستەم" title="ئامرازەکان" detail="ئامرازەکانت بە شێوەی ماژوولار ڕێکبخە و دەسەڵاتەکانت لە دەستت بێت." action={<Button variant="ghost"><LockKeyhole size={15} /> بەڕێوەبردنی دەسەڵات</Button>} /><div className="mb-6 flex flex-wrap gap-2">{cats.map(c => <button key={c} onClick={() => setFilter(c)} data-testid={`button-tool-filter-${c}`} className={cn('rounded-xl border px-3 py-2 text-xs transition', filter === c ? 'border-primary/50 bg-primary/15 text-violet-2' : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground')}>{c}</button>)}</div><QueryState loading={tools.isLoading} error={tools.error}>{!shown?.length ? <Empty icon={Wrench} title="ئامرازەکان نادۆزرایەوە" detail="هێشتا هیچ ئامرازێک بۆ هەژمارەکەت تۆمار نەکراوە." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map(t => <div key={t.id} data-testid={`card-tool-${t.id}`} className="glass rounded-2xl p-5"><div className="mb-5 flex items-start justify-between"><div className="rounded-2xl bg-secondary p-3 text-primary">{t.category.toLowerCase().includes('code') ? <Code2 size={20} /> : t.category.toLowerCase().includes('data') ? <Database size={20} /> : <Cpu size={20} />}</div><Badge tone={t.status === 'Ready' ? 'success' : t.status === 'Disabled' ? 'danger' : 'warning'}>{t.status}</Badge></div><h2 className="font-bold">{t.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{t.description}</p><div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4 text-xs">{t.requiresPermission ? <span className="flex items-center gap-1.5 text-muted-foreground"><LockKeyhole size={13} /> پێویستی بە دەسەڵاتە</span> : <span className="flex items-center gap-1.5 text-[hsl(var(--success))]"><ShieldCheck size={13} /> ئامادەیە</span>}<button data-testid={`button-configure-tool-${t.id}`} className="text-primary hover:underline">ڕێکخستن</button></div></div>)}</div>}</QueryState></div>;
}

function Memory() {
  const memories = useListMemories(); const create = useCreateMemory(); const update = useUpdateMemory(); const remove = useDeleteMemory(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [content, setContent] = useState(''); const [category, setCategory] = useState('گشتی');
  const refresh = () => qc.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
  const submit = async (e: FormEvent) => { e.preventDefault(); if (!content.trim()) return; await create.mutateAsync({ data: { content, category } }); setContent(''); setOpen(false); refresh(); };
  return <div className="page-enter" dir="rtl"><PageHeading eyebrow="بیرگەی زیرەک" title="بیرەکان" detail="ئەو شتانەی دەتەوێت HAMAUMIN لە گفتوگۆکانی داهاتوودا بیزانێت." action={<Button onClick={() => setOpen(!open)}><Plus size={16} /> بیرێکی نوێ</Button>} />{open && <form onSubmit={submit} className="glass mb-5 grid gap-4 rounded-2xl p-5 md:grid-cols-[1.5fr_.55fr_auto] md:items-end"><Field label="ناوەڕۆکی بیر"><input data-testid="input-memory-content" value={content} onChange={e => setContent(e.target.value)} placeholder="نمونە: من حەزم لە وەڵامی کورتە..." className="field" autoFocus /></Field><Field label="پۆل"><input data-testid="input-memory-category" value={category} onChange={e => setCategory(e.target.value)} className="field" /></Field><Button type="submit" disabled={create.isPending}><Save size={16} /> پاشەکەوت</Button></form>}<QueryState loading={memories.isLoading} error={memories.error}>{!memories.data?.length ? <Empty icon={Database} title="بیرگەکەت هێشتا بەتاڵە" detail="بیرێک زیاد بکە تا یارمەتیدەرەکەت زیاتر لە شێوازی تۆ بزانێت." action={<Button onClick={() => setOpen(true)}><Plus size={16} /> زیادکردنی بیر</Button>} /> : <div className="space-y-3">{memories.data.map(m => <div key={m.id} data-testid={`row-memory-${m.id}`} className="glass flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-4"><div className={cn('mt-0.5 rounded-xl p-2.5', m.enabled ? 'bg-primary/12 text-primary' : 'bg-secondary text-muted-foreground')}><Database size={17} /></div><div className="min-w-0"><p className={cn('text-sm leading-7', !m.enabled && 'text-muted-foreground line-through')}>{m.content}</p><div className="mt-2 flex items-center gap-2"><Badge tone="neutral">{m.category}</Badge><span className="text-[11px] text-muted-foreground">{formatDate(m.updatedAt)}</span></div></div></div><div className="flex items-center gap-2 border-t border-border pt-3 sm:border-0 sm:pt-0"><button onClick={() => update.mutate({ memoryId: m.id, data: { enabled: !m.enabled } }, { onSuccess: refresh })} data-testid={`button-toggle-memory-${m.id}`} className={cn('relative h-6 w-11 rounded-full transition', m.enabled ? 'bg-primary' : 'bg-secondary')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-foreground transition-all', m.enabled ? 'right-1' : 'right-6')} /></button><IconButton label={`سڕینەوەی بیر ${m.id}`} onClick={() => { if (window.confirm('ئەم بیرە بسڕمەوە؟')) remove.mutate({ memoryId: m.id }, { onSuccess: refresh }); }} className="text-destructive hover:border-destructive"><Trash2 size={15} /></IconButton></div></div>)}</div>}</QueryState></div>;
}

function Settings() {
  const settings = useGetSettings(); const themes = useListThemes(); const update = useUpdateSettings(); const createTheme = useCreateTheme(); const updateTheme = useUpdateTheme(); const removeTheme = useDeleteTheme(); const applyTheme = useApplyTheme(); const qc = useQueryClient();
  const [local, setLocal] = useState<any>(null); const [tab, setTab] = useState('ai'); const [themeName, setThemeName] = useState('شەوی هێمن'); const [tokens, setTokens] = useState({ primary: '#a978f2', accent: '#f4a34d', background: '#100c18', card: '#1b1525' });
  useEffect(() => { if (settings.data && !local) setLocal(settings.data); }, [settings.data, local]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hexToHsl(tokens.primary));
    root.style.setProperty('--accent', hexToHsl(tokens.accent));
    root.style.setProperty('--background', hexToHsl(tokens.background));
    root.style.setProperty('--card', hexToHsl(tokens.card));
  }, [tokens]);
  const save = (patch: Record<string, unknown>) => { setLocal((x: any) => ({ ...x, ...patch })); update.mutate({ data: patch }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }) }); };
  const applyVars = (t: any) => { if (t?.tokens) setTokens((current) => ({ ...current, ...t.tokens })); };
  const create = async () => { const t = await createTheme.mutateAsync({ data: { name: themeName, mode: 'custom', tokens } }); applyVars(t); qc.invalidateQueries({ queryKey: getListThemesQueryKey() }); };
  const tabs = [['ai', 'هۆشی دەستکرد', Sparkles], ['account', 'هەژمار', UserRound], ['security', 'پاراستن', ShieldCheck], ['permissions', 'دەسەڵاتەکان', LockKeyhole], ['theme', 'دروستکەری ڕووکار', Palette]] as const;
  return <div className="page-enter" dir="rtl"><PageHeading eyebrow="کۆنترۆڵی کەسی" title="ڕێکخستنەکان" detail="HAMAUMIN بەو شێوەیە ڕێکبخە کە بۆ تۆ دروستە." /><div className="grid gap-6 lg:grid-cols-[240px_1fr]"><div className="glass flex gap-1 overflow-auto rounded-2xl p-2 lg:block lg:space-y-1 lg:overflow-visible">{tabs.map(([key, label, I]) => <button key={key} onClick={() => setTab(key)} data-testid={`button-settings-tab-${key}`} className={cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm transition lg:w-full', tab === key ? 'bg-primary/15 font-bold text-violet-2' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}><I size={17} />{label}</button>)}</div><div className="glass rounded-3xl p-5 md:p-7"><QueryState loading={settings.isLoading} error={settings.error}>{local && tab === 'ai' && <section><SettingHeader title="ئەزموونی گفتوگۆ" detail="شێوازی کارکردنی یارمەتیدەرەکەت کۆنترۆڵ بکە." /><div className="space-y-4"><SettingRow icon={MessageCircle} title="زمانی سەرەکی" detail="زمانی وەڵامدانەوەی HAMAUMIN"><select value={local.language} onChange={e => save({ language: e.target.value })} data-testid="select-settings-language" className="field w-40"><option value="ku">کوردی سۆرانی</option><option value="en">English</option></select></SettingRow><SettingRow icon={Database} title="بیرگەی زیرەک" detail="ڕێگە بدە HAMAUMIN شتە گرنگەکانت لەبیر بێت"><Toggle checked={local.memoryEnabled} onChange={() => save({ memoryEnabled: !local.memoryEnabled })} label="memory" /></SettingRow><SettingRow icon={Activity} title="ئاگادارییەکان" detail="ئاگاداری لە کاتی تەواوبوونی ئەرکەکان"><Toggle checked={local.notificationsEnabled} onChange={() => save({ notificationsEnabled: !local.notificationsEnabled })} label="notifications" /></SettingRow><SettingRow icon={Bot} title="دەنگ" detail="وەڵامەکان بە دەنگ بخوێنرێنەوە"><Toggle checked={local.voiceEnabled} onChange={() => save({ voiceEnabled: !local.voiceEnabled })} label="voice" /></SettingRow></div></section>}{local && tab === 'account' && <section><SettingHeader title="زانیاری هەژمار" detail="کۆنترۆڵی ناسنامە و شێوازی پیشاندانی خۆت." /><div className="space-y-4"><SettingRow icon={UserRound} title="ناوی پیشاندراو" detail="لە ناو HAMAUMIN بەو ناوە بانگت دەکەم"><div className="rounded-xl border border-border bg-secondary px-4 py-2 text-sm">بەکارهێنەر</div></SettingRow><SettingRow icon={KeyRound} title="پلانی ئێستا" detail="پلانی تایبەت بۆ بەکارهێنانی ڕۆژانە"><Badge tone="violet">تایبەت</Badge></SettingRow><Button variant="danger">چوونەدەرەوە</Button></div></section>}{tab === 'security' && <section><SettingHeader title="پاراستن و نهێنی" detail="دڵنیابە کە داتاکانت لە شوێنی خۆیەتی." /><div className="space-y-4"><SettingRow icon={ShieldCheck} title="پاراستنی هەژمار" detail="هەموو گفتوگۆ و بیرەکانت بە شێوەی پارێزراو هەڵدەگیرێن"><Badge tone="success"><CheckCircle2 size={12} /> چالاک</Badge></SettingRow><SettingRow icon={LockKeyhole} title="دوو هەنگاوی پاراستن" detail="پاراستنێکی زیادە بۆ چوونەژوورەوە"><Button variant="ghost">ڕێکخستن</Button></SettingRow></div></section>}{tab === 'permissions' && <section><SettingHeader title="دەسەڵاتەکان" detail="بڕیار بدە HAMAUMIN بۆ چی دەستپێگەیشتن هەبێت." /><div className="space-y-4"><SettingRow icon={Code2} title="دروستکردنی فایل و کۆد" detail="ڕێگەدان بە یارمەتیدەر بۆ کارکردن لەسەر پڕۆژەکان"><Toggle checked={true} onChange={() => undefined} label="project-permission" /></SettingRow><SettingRow icon={HardDrive} title="هەڵگرتنی بیرەکان" detail="بیرە نوێکان تەنها بە ڕەزامەندی تۆ زیاد دەکرێن"><Toggle checked={local?.memoryEnabled} onChange={() => save({ memoryEnabled: !local.memoryEnabled })} label="memory-permission" /></SettingRow></div></section>}{tab === 'theme' && <ThemeBuilder themes={themes.data ?? []} name={themeName} setName={setThemeName} tokens={tokens} setTokens={setTokens} onCreate={create} onApply={(id) => applyTheme.mutate({ themeId: id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListThemesQueryKey() }) })} onUpdate={(id, data) => updateTheme.mutate({ themeId: id, data })} onDelete={(id) => removeTheme.mutate({ themeId: id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListThemesQueryKey() }) })} />}</QueryState></div></div></div>;
}
function SettingHeader({ title, detail }: { title: string; detail: string }) { return <div className="mb-7 border-b border-border/70 pb-5"><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div>; }
function SettingRow({ icon: I, title, detail, children }: { icon: typeof Bot; title: string; detail: string; children: ReactNode }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/35 p-4"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><I size={17} /></div><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div></div>{children}</div>; }
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) { return <button role="switch" aria-checked={checked} aria-label={label} data-testid={`switch-${label}`} onClick={onChange} className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-primary' : 'bg-secondary')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-foreground transition-all', checked ? 'right-1' : 'right-6')} /></button>; }
function ThemeBuilder({ themes, name, setName, tokens, setTokens, onCreate, onApply, onUpdate, onDelete }: { themes: any[]; name: string; setName: (v: string) => void; tokens: Record<string, string>; setTokens: (v: any) => void; onCreate: () => void; onApply: (id: number) => void; onUpdate: (id: number, data: any) => void; onDelete: (id: number) => void }) {
  return <section><SettingHeader title="دروستکەری ڕووکار" detail="ڕەنگ و هەستەکەی HAMAUMIN بە شێوەی خۆت دروست بکە." /><div className="grid gap-6 xl:grid-cols-[1fr_1fr]"><div className="space-y-4"><Field label="ناوی ڕووکار"><input data-testid="input-theme-name" value={name} onChange={e => setName(e.target.value)} className="field" /></Field>{Object.entries(tokens).map(([key, value]) => <label key={key} className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3"><span className="text-sm">{key === 'primary' ? 'ڕەنگی هێز' : key === 'accent' ? 'ڕەنگی کردار' : key === 'background' ? 'بنەما' : 'کارتەکان'}</span><div className="flex items-center gap-2"><span className="font-mono text-[10px] text-muted-foreground">{value}</span><input type="color" value={value} onChange={e => setTokens({ ...tokens, [key]: e.target.value })} data-testid={`input-theme-color-${key}`} className="h-8 w-10 cursor-pointer rounded-lg border-0 bg-transparent" /></div></label>)}<Button onClick={onCreate}><Save size={15} /> پاشەکەوتکردنی ڕووکار</Button></div><div className="rounded-3xl border border-border bg-[var(--hama-background,#100c18)] p-5" style={{ ['--hama-primary' as any]: tokens.primary, ['--hama-accent' as any]: tokens.accent }}><div className="mb-4 flex items-center gap-2"><div className="rounded-xl p-2" style={{ background: `${tokens.primary}26`, color: tokens.primary }}><Palette size={17} /></div><span className="text-sm font-bold">پێشبینینی ڕووکار</span></div><div className="rounded-2xl border border-border bg-[var(--hama-card,#1b1525)] p-5"><span className="kicker" style={{ color: tokens.accent }}>HAMAUMIN / PREVIEW</span><h3 className="mt-4 text-xl font-extrabold">ڕووکارێک کە بۆ تۆیە</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">تۆ دەتوانیت ئەم شوێنە بە تەواوی بگونجێنیت بۆ ڕۆژانەکەت.</p><button className="mt-5 rounded-xl px-4 py-2 text-sm font-bold" style={{ background: tokens.accent, color: '#18121f' }}>کردارێکی نوێ</button></div></div></div><div className="mt-8"><h3 className="mb-3 text-sm font-bold">ڕووکارە پاشەکەوتکراوەکان</h3>{!themes.length ? <p className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">هێشتا ڕووکارێکت پاشەکەوت نەکردووە.</p> : <div className="grid gap-3 md:grid-cols-2">{themes.map(t => <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-secondary/35 p-3"><div><p className="text-sm font-semibold">{t.name}</p><span className="text-[11px] text-muted-foreground">{t.mode} {t.isApplied ? '· جێبەجێکراوە' : ''}</span></div><div className="flex gap-1"><Button variant={t.isApplied ? 'soft' : 'ghost'} className="min-h-8 px-3 text-xs" onClick={() => onApply(t.id)}>{t.isApplied ? <Check size={13} /> : 'جێبەجێکردن'}</Button><IconButton label={`سڕینەوەی ڕووکار ${t.id}`} onClick={() => onDelete(t.id)}><Trash2 size={14} /></IconButton></div></div>)}</div>}</div></section>;
}

function Auth({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  return <div className="min-h-[100dvh] overflow-hidden bg-[hsl(258_34%_7%)]" dir="rtl"><div className="mx-auto grid min-h-[100dvh] max-w-6xl lg:grid-cols-[.8fr_1.2fr]"><div className="relative hidden flex-col justify-between overflow-hidden border-l border-border/70 p-10 lg:flex"><div className="absolute -left-28 top-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" /><Link href="/" data-testid="link-auth-brand" className="relative flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sparkles size={19} /></span><strong>HAMAUMIN</strong></Link><div className="relative"><span className="kicker">یارمەتیدەری کوردی</span><h1 className="mt-5 max-w-sm text-5xl font-extrabold leading-[1.35]">بیرۆکەکانت،<br /><span className="text-violet-2">شوێنی خۆیان</span><br />دەدۆزنەوە.</h1><p className="mt-6 max-w-sm text-sm leading-8 text-muted-foreground">شوێنێکی تایبەت و بەهێز بۆ ئەوەی بیر بکەیتەوە، دابمەزرێنیت و دروستی بکەیت.</p></div><div className="relative text-xs text-muted-foreground">HAMAUMIN · بە هەستی ناوخۆیی</div></div><div className="flex items-center justify-center p-5 md:p-10"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><Link href="/" data-testid="link-auth-brand-mobile" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Sparkles size={18} /></span><strong>HAMAUMIN</strong></Link></div><div className="mb-8"><span className="kicker">{mode === 'sign-in' ? 'گەڕانەوە' : 'دەستپێکردن'}</span><h2 className="mt-3 text-3xl font-extrabold">{mode === 'sign-in' ? 'بەخێربێیتەوە' : 'هەژمارێک دروست بکە'}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === 'sign-in' ? 'بچۆ ژوورەوە بۆ بەردەوامبوون لە شوێنی کەسیت.' : 'لەگەڵ HAMAUMIN شوێنی کارێکی نوێ بۆ خۆت بکەرەوە.'}</p></div><form onSubmit={e => e.preventDefault()} className="space-y-4"><Field label="ئیمەیڵ"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} data-testid="input-auth-email" className="field" placeholder="you@example.com" /></Field><Field label="وشەی نهێنی"><input type="password" required value={password} onChange={e => setPassword(e.target.value)} data-testid="input-auth-password" className="field" placeholder="••••••••" /></Field><Button type="submit" className="mt-3 w-full">{mode === 'sign-in' ? 'چوونەژوورەوە' : 'دروستکردنی هەژمار'} <ArrowLeft size={15} /></Button></form><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> یان <span className="h-px flex-1 bg-border" /></div><Button variant="ghost" className="w-full"><span className="font-bold">G</span> بە Google بەردەوامبە</Button><p className="mt-7 text-center text-sm text-muted-foreground">{mode === 'sign-in' ? 'هەژمارت نییە؟' : 'پێشتر هەژمارت هەیە؟'} <Link href={mode === 'sign-in' ? '/sign-up' : '/sign-in'} data-testid="link-auth-switch" className="font-bold text-primary hover:underline">{mode === 'sign-in' ? 'ئێستا دروستی بکە' : 'بچۆ ژوورەوە'}</Link></p><p className="mt-8 text-center text-[11px] text-muted-foreground">بە بەکارهێنانی HAMAUMIN، ڕێککەوتنی بەکارهێنان و سیاسەتی نهێنییەکانت قبووڵ دەکەیت.</p></div></div></div></div>;
}

function ClerkAuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4" dir="rtl">
      {mode === 'sign-in' ? (
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
        />
      ) : (
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
        />
      )}
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  useEffect(() => {
    let previousUserId: string | null | undefined;
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUserId !== undefined && previousUserId !== userId) qc.clear();
      previousUserId = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function Router() {
  const [path] = useLocation();
  const pageRoutes = <ErrorBoundary resetKey={path}><Switch><Route path="/" component={Home} /><Route path="/tasks" component={Tasks} /><Route path="/tasks/:id" component={TaskDetail} /><Route path="/projects" component={Projects} /><Route path="/projects/:id" component={ProjectDetail} /><Route path="/tools" component={Tools} /><Route path="/memory" component={Memory} /><Route path="/settings" component={Settings} /><Route component={NotFound} /></Switch></ErrorBoundary>;
  if (path.startsWith('/sign-in')) return <ClerkAuthPage mode="sign-in" />;
  if (path.startsWith('/sign-up')) return <ClerkAuthPage mode="sign-up" />;
  return <Shell>{pageRoutes}</Shell>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) =>
    basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in the environment.');
  }
  return <WouterRouter base={basePath}><ClerkRoutes /></WouterRouter>;
}
export default App;