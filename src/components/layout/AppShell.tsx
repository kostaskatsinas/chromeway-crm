"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui";
import { CommandCenter, QuickActivityModal } from "@/components/layout/CommandCenter";
import { useI18n, fmtDateTime } from "@/i18n/LanguageProvider";
import { can, type Capability } from "@/lib/rbac";

export type NavItem = { href: string; labelKey: string; icon: string; cap: Capability };
export type NavGroup = { titleKey: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    titleKey: "nav.salesGroup",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", icon: "◫", cap: "dashboard.view" },
      { href: "/workspace", labelKey: "nav.workspace", icon: "◎", cap: "dashboard.view" },
      { href: "/pipeline", labelKey: "nav.pipeline", icon: "⇉", cap: "pipeline.view" },
      { href: "/contacts", labelKey: "nav.contacts", icon: "☺", cap: "contacts.view" },
      { href: "/companies", labelKey: "nav.companies", icon: "⌂", cap: "companies.view" },
      { href: "/visits", labelKey: "nav.visits", icon: "⌖", cap: "visits.view" },
    ],
  },
  {
    titleKey: "nav.deliveryGroup",
    items: [
      { href: "/catalogue", labelKey: "nav.catalogue", icon: "❖", cap: "catalogue.view" },
      { href: "/quotes", labelKey: "nav.quotes", icon: "▤", cap: "quotes.view" },
      { href: "/projects", labelKey: "nav.projects", icon: "▦", cap: "projects.view" },
      { href: "/calendar", labelKey: "nav.calendar", icon: "▦", cap: "calendar.view" },
      { href: "/tasks", labelKey: "nav.tasks", icon: "✓", cap: "tasks.view" },
    ],
  },
  {
    titleKey: "nav.operationsGroup",
    items: [
      { href: "/inventory", labelKey: "nav.inventory", icon: "▣", cap: "inventory.view" },
      { href: "/finance", labelKey: "nav.finance", icon: "€", cap: "finance.view" },
      { href: "/reports", labelKey: "nav.reports", icon: "◔", cap: "reports.view" },
    ],
  },
];

const CREATE_ACTIONS: Array<{ href: string; label: string; icon: string; cap: Capability }> = [
  { href: "/pipeline?new=1", label: "Νέο lead", icon: "⇉", cap: "pipeline.edit" },
  { href: "/contacts?new=1", label: "Νέα επαφή", icon: "☺", cap: "contacts.edit" },
  { href: "/quotes/new", label: "Νέα προσφορά", icon: "▤", cap: "quotes.edit" },
  { href: "/projects/new", label: "Νέο έργο", icon: "▦", cap: "projects.edit" },
  { href: "/finance?tab=expenses&new=1", label: "Νέο έξοδο", icon: "€", cap: "finance.edit" },
];

type SearchHit = { type: string; id: string; title: string; sub?: string; href: string };

type Notif = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

export function Topbar({ user }: { user: { id: string; firstName: string; lastName: string; role: string; email: string } }) {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [showHits, setShowHits] = useState(false);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const availableCreateActions = CREATE_ACTIONS.filter((action) => can(user.role as never, action.cap));
  const canLogActivity = can(user.role as never, "tasks.edit") && can(user.role as never, "contacts.view");
  const commandItems = [
    ...NAV_GROUPS.flatMap((group) => group.items)
      .filter((item) => can(user.role as never, item.cap))
      .map((item) => ({ href: item.href, label: t(item.labelKey), icon: item.icon, group: "navigation" as const })),
    ...availableCreateActions.map((action) => ({ ...action, group: "create" as const })),
  ];

  useEffect(() => {
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(q)}`);
        setHits(res.hits);
        setShowHits(true);
      } catch {}
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowHits(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    setShowHits(false);
    setMenuOpen(false);
    setShowNotifs(false);
    setCreateOpen(false);
    setMobileSearchOpen(false);
    setCommandOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  const loadNotifs = async () => {
    try {
      const res = await api<{ notifications: Notif[] }>("/api/notifications");
      setNotifs(res.notifications);
    } catch {}
  };
  useEffect(() => {
    loadNotifs();
    const iv = setInterval(loadNotifs, 60000);
    return () => clearInterval(iv);
  }, []);

  const unreadCount = notifs?.filter((n) => !n.readAt).length ?? 0;

  const markAllRead = async () => {
    await api("/api/notifications", { method: "PATCH" });
    loadNotifs();
  };

  const signOut = async () => {
    await api("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 h-14 bg-paper/90 backdrop-blur border-b border-line-soft flex items-center gap-3 px-4 lg:px-6">
      {/* Global search */}
      <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">⌕</span>
        <input
          ref={desktopSearchInputRef}
          className="input pl-8 pr-14 h-9 bg-surface"
          placeholder={t("search.placeholder")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setShowHits(true)}
        />
        <button type="button" onClick={() => setCommandOpen(true)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] text-ink-faint" aria-label="Άνοιγμα κέντρου εντολών">⌘K</button>
        {showHits && (
          <div className="card absolute top-11 left-0 right-0 max-h-96 overflow-y-auto shadow-pop z-50">
            {hits.length === 0 ? (
              <p className="p-4 text-sm text-ink-faint">{t("common.noData")}</p>
            ) : (
              hits.map((h) => (
                <Link key={`${h.type}-${h.id}`} href={h.href} onClick={() => setShowHits(false)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-parchment/70">
                  <span className="text-xs uppercase tracking-wide text-clay font-semibold w-16 shrink-0">{t(`biz.${h.type}`) !== `biz.${h.type}` ? h.type : h.type}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">{h.title}</span>
                    {h.sub && <span className="block text-xs text-ink-faint truncate">{h.sub}</span>}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Mobile search */}
      <button
        onClick={() => {
          setMobileSearchOpen(true);
          requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
        }}
        className="btn btn-ghost btn-sm sm:hidden text-base"
        aria-label="Αναζήτηση"
      >
        ⌕
      </button>

      {/* Global create */}
      {availableCreateActions.length > 0 && <div className="relative">
        <button onClick={() => setCreateOpen(!createOpen)} className="btn btn-primary btn-sm" aria-expanded={createOpen} aria-haspopup="menu">
          <span aria-hidden="true">＋</span><span className="hidden sm:inline">Δημιουργία</span>
        </button>
        {createOpen && (
          <div role="menu" className="card absolute right-0 top-10 w-52 shadow-pop z-50 overflow-hidden py-1">
            {availableCreateActions.map((action) => (
              <Link key={action.href} role="menuitem" href={action.href} className="flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-parchment/70">
                <span className="w-5 text-center text-clay" aria-hidden="true">{action.icon}</span>
                {action.label}
              </Link>
            ))}
            {canLogActivity && <button type="button" role="menuitem" onClick={() => { setCreateOpen(false); setActivityOpen(true); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-parchment/70 text-left">
              <span className="w-5 text-center text-clay" aria-hidden="true">☎</span>
              Καταγραφή επικοινωνίας
            </button>}
          </div>
        )}
      </div>}

      {/* Language */}
      <button onClick={() => setLang(lang === "el" ? "en" : "el")} className="btn btn-ghost btn-sm uppercase tracking-widest" title="Language">
        {lang === "el" ? "EN" : "ΕΛ"}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => {
            setShowNotifs(!showNotifs);
            if (!showNotifs) loadNotifs();
          }}
          className="btn btn-ghost btn-sm relative text-base"
          aria-label="Ειδοποιήσεις"
        >
          ◔
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rust text-white text-[9px] rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {showNotifs && notifs && (
          <div className="card absolute right-0 top-10 w-80 sm:w-96 max-h-[28rem] overflow-y-auto shadow-pop z-50">
            <div className="flex justify-between items-center px-4 py-3 border-b border-line-soft sticky top-0 bg-surface">
              <p className="font-semibold text-sm">{t("notif.title")}</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-clay hover:underline">
                  {t("notif.markAllRead")}
                </button>
              )}
            </div>
            {notifs.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-faint">{t("notif.empty")}</p>
            ) : (
              notifs.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "#"}
                  onClick={() => setShowNotifs(false)}
                  className={cn("block px-4 py-3 border-b border-line-soft last:border-0 hover:bg-parchment/60", !n.readAt && "bg-clay-soft/40")}
                >
                  <p className="text-[13px] font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-ink-soft mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10.5px] text-ink-faint mt-1">{fmtDateTime(n.createdAt, lang)}</p>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative">
        <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2.5 py-1 pr-1 group">
          <Avatar name={`${user.firstName} ${user.lastName}`} color="#9a5b36" size={30} />
          <span className="hidden md:block text-left leading-tight">
            <span className="block text-[13px] font-semibold">
              {user.firstName} {user.lastName}
            </span>
            <span className="block text-[11px] text-ink-faint">{t(`role.${user.role}`)}</span>
          </span>
        </button>
        {menuOpen && (
          <div className="card absolute right-0 top-12 w-56 shadow-pop z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-line-soft">
              <p className="text-[13px] font-semibold">{user.email}</p>
              <Link href="/settings?tab=profile" onClick={() => setMenuOpen(false)} className="text-xs text-clay hover:underline mt-1 block">
                {t("settings.profile")}
              </Link>
            </div>
            <button onClick={signOut} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-parchment/70 text-rust">
              {t("auth.signOut")}
            </button>
          </div>
        )}
      </div>

      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-paper sm:hidden p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">⌕</span>
              <input
                ref={mobileSearchInputRef}
                className="input pl-8 h-11 bg-surface"
                placeholder={t("search.placeholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => hits.length && setShowHits(true)}
              />
            </div>
            <button className="btn btn-ghost min-h-11" onClick={() => setMobileSearchOpen(false)} aria-label="close search">×</button>
          </div>
          <div className="mt-3 card overflow-hidden max-h-[calc(100vh-6rem)] overflow-y-auto">
            {q.length < 2 ? (
              <p className="p-5 text-sm text-ink-faint">Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες</p>
            ) : hits.length === 0 ? (
              <p className="p-5 text-sm text-ink-faint">{t("common.noData")}</p>
            ) : hits.map((h) => (
              <Link key={`${h.type}-${h.id}`} href={h.href} className="flex items-center gap-3 px-4 py-3 border-b border-line-soft last:border-0">
                <span className="text-[10px] uppercase tracking-wide text-clay font-semibold w-20 shrink-0">{h.type}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{h.title}</span>
                  {h.sub && <span className="block text-xs text-ink-faint truncate">{h.sub}</span>}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <CommandCenter
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commandItems}
        canLogActivity={canLogActivity}
        onLogActivity={() => setActivityOpen(true)}
      />
      {canLogActivity && <QuickActivityModal open={activityOpen} onClose={() => setActivityOpen(false)} />}
    </header>
  );
}

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [openMobile, setOpenMobile] = useState(false);

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => can(role as never, it.cap)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full bg-clay text-white shadow-pop text-xl"
        onClick={() => setOpenMobile(true)}
        aria-label="Άνοιγμα μενού"
        aria-expanded={openMobile}
        aria-controls="primary-sidebar"
      >
        ≡
      </button>

      {openMobile && <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpenMobile(false)} />}

      <aside
        id="primary-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-60 bg-parchment/70 backdrop-blur border-r border-line-soft flex flex-col transition-transform lg:translate-x-0",
          openMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-14 flex items-center px-6 border-b border-line-soft/60">
          <Link href="/dashboard" className="display text-xl tracking-wide" onClick={() => setOpenMobile(false)}>
            chromeway<span className="text-clay">.</span>
          </Link>
          <button className="ml-auto lg:hidden text-lg" onClick={() => setOpenMobile(false)} aria-label="Κλείσιμο μενού">
            ×
          </button>
        </div>
        <nav aria-label="Κύρια πλοήγηση" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.titleKey}>
              <p className="eyebrow px-2 mb-1.5">{t(g.titleKey)}</p>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = pathname.startsWith(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={() => setOpenMobile(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                          active ? "bg-clay text-white shadow-sm" : "text-ink-soft hover:bg-parchment hover:text-ink"
                        )}
                      >
                        <span aria-hidden="true" className={cn("text-base w-5 text-center", active ? "opacity-100" : "opacity-60")}>{it.icon}</span>
                        {t(it.labelKey)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-line-soft/60">
          <p className="text-[10.5px] text-ink-faint leading-relaxed">Chromeway CRM v1.0<br />Athens · Peloponnese · Greece</p>
        </div>
      </aside>
    </>
  );
}
