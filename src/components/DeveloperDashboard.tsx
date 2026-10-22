"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Activity, BadgeCheck, Ban, Check, CheckCircle2, Clipboard, Copy, Download, KeyRound,
  LayoutDashboard, LoaderCircle, LogOut, Plus, RefreshCw, ScrollText, Search, Settings2,
  ShieldCheck, SlidersHorizontal, UserCheck, Users, WalletCards, X, XCircle,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import type { AdminDepositView, AdminOverview, AdminUserView } from "@/lib/admin-types";
import type { SafeUser } from "@/lib/auth-types";
import type { PlatformConfig } from "@/lib/settings";
import { csvCell, formatDate, formatEgp, formatMoney } from "@/lib/format";

type Tab = "overview" | "users" | "codes" | "deposits" | "settings" | "audit";
type Toast = { id: number; message: string; error?: boolean };

const tabs = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "users", label: "المستخدمون", icon: Users },
  { id: "codes", label: "أكواد التفعيل", icon: KeyRound },
  { id: "deposits", label: "طلبات الإيداع", icon: WalletCards },
  { id: "settings", label: "إعدادات المنصة", icon: Settings2 },
  { id: "audit", label: "سجل التدقيق", icon: ScrollText },
] as const;

const userStatus = { pending: "بانتظار التفعيل", active: "نشط", suspended: "موقوف" };

export function DeveloperDashboard({ initialData, currentUser }: { initialData: AdminOverview; currentUser: SafeUser }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [generated, setGenerated] = useState<{ code: string; name: string; expiresAt: string } | null>(null);
  const [adjustUser, setAdjustUser] = useState<AdminUserView | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [review, setReview] = useState<{ deposit: AdminDepositView; action: "approve" | "reject" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [settings, setSettings] = useState<PlatformConfig>(initialData.settings);
  const [copied, setCopied] = useState(false);

  useEffect(() => setSettings(data.settings), [data.settings]);

  function notify(message: string, error = false) {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, error }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }

  async function refresh() {
    const response = await fetch("/api/admin/overview", { cache: "no-store" });
    const next = await response.json() as AdminOverview & { error?: string };
    if (!response.ok) throw new Error(next.error ?? "تعذر تحديث اللوحة");
    setData(next);
  }

  async function action(key: string, url: string, body: unknown, method = "PATCH") {
    setBusy(key);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { error?: string; code?: string; expiresAt?: string; user?: { name: string } };
      if (!response.ok) throw new Error(result.error ?? "تعذر تنفيذ الإجراء");
      await refresh();
      return result;
    } catch (error) {
      notify(error instanceof Error ? error.message : "تعذر الاتصال", true);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function generateCode(user: AdminUserView) {
    const result = await action(`code-${user.id}`, "/api/admin/codes", { userId: user.id }, "POST");
    if (result?.code) {
      setGenerated({ code: result.code, name: user.name, expiresAt: result.expiresAt! });
      notify("تم إنشاء الكود. انسخه الآن وأرسله للمستخدم.");
    }
  }

  async function userAction(user: AdminUserView, operation: "activate" | "suspend" | "restore") {
    const result = await action(`user-${user.id}`, "/api/admin/users", { userId: user.id, action: operation });
    if (result) notify(operation === "suspend" ? "تم إيقاف الحساب وإنهاء جلساته." : "تم تفعيل الحساب بنجاح.");
  }

  async function submitAdjustment() {
    if (!adjustUser) return;
    const result = await action("adjust", "/api/admin/users", { userId: adjustUser.id, action: "adjustBalance", amount: Number(adjustAmount), reason: adjustReason });
    if (result) {
      notify("تمت تسوية الرصيد وتسجيلها في كشف المستخدم والتدقيق.");
      setAdjustUser(null); setAdjustAmount(""); setAdjustReason("");
    }
  }

  async function submitReview() {
    if (!review) return;
    const result = await action("review", "/api/admin/deposits", { id: review.deposit.id, action: review.action, note: reviewNote });
    if (result) {
      notify(review.action === "approve" ? "تم اعتماد التحويل وإضافة الرصيد في معاملة واحدة." : "تم رفض الطلب وإرسال سبب الرفض إلى سجل المستخدم.");
      setReview(null); setReviewNote("");
    }
  }

  async function saveSettings() {
    const result = await action("settings", "/api/admin/settings", settings);
    if (result) notify("تم حفظ الإعدادات وتطبيقها على الطلبات الجديدة.");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/developer/login"); router.refresh();
  }

  function exportUsers() {
    const rows = [["الاسم", "البريد", "الحالة", "النقد", "صافي الإيداع", "الأوامر", "تاريخ التسجيل"], ...filteredUsers.map((user) => [user.name, user.email, user.status, user.cash, user.netDeposits, user.orderCount, user.createdAt])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "midar-users.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const filteredUsers = useMemo(() => data.users.filter((user) => {
    const term = search.trim().toLowerCase();
    return (statusFilter === "all" || user.status === statusFilter) && (!term || `${user.name} ${user.email}`.toLowerCase().includes(term));
  }), [data.users, search, statusFilter]);
  const pendingDeposits = data.deposits.filter((deposit) => deposit.status === "pending");

  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-[#07100e] text-white">
        <div className="grid min-h-screen lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-l border-white/[0.07] bg-[#0a1411] p-4 lg:min-h-screen lg:p-5">
            <div className="flex items-center justify-between"><Logo /><span className="rounded-md border border-lime-300/15 px-2 py-1 text-[8px] text-lime-300/60">DEV</span></div>
            <nav className="mt-7 flex gap-1 overflow-x-auto lg:grid lg:overflow-visible" aria-label="أقسام لوحة المطور">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[11px] transition-colors ${tab === item.id ? "bg-lime-300/[0.08] text-lime-200" : "text-white/35 hover:bg-white/[0.03] hover:text-white/65"}`}><item.icon className="size-4" />{item.label}{item.id === "deposits" && data.metrics.pendingDeposits > 0 && <span className="mr-auto grid size-5 place-items-center rounded-md bg-amber-300/10 font-mono text-[9px] text-amber-200">{data.metrics.pendingDeposits}</span>}</button>)}</nav>
            <div className="mt-6 hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 lg:block"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-lime-300/10 text-lime-300"><ShieldCheck className="size-4" /></span><div><div className="text-[11px] text-white/70">{currentUser.name}</div><div className="mt-1 truncate font-mono text-[8px] text-white/25" dir="ltr">{currentUser.email}</div></div></div><button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.07] py-2 text-[10px] text-white/35 hover:text-red-300"><LogOut className="size-3.5" /> تسجيل الخروج</button></div>
          </aside>

          <section className="min-w-0 p-4 sm:p-6 lg:p-8">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><span className="text-[10px] text-lime-300/45">MIDAR / DEVELOPER CONSOLE</span><h1 className="mt-2 text-2xl font-medium sm:text-3xl">{tabs.find((item) => item.id === tab)?.label}</h1></div><div className="flex items-center gap-2"><button onClick={async () => { setBusy("refresh"); try { await refresh(); notify("البيانات محدثة."); } catch (error) { notify(error instanceof Error ? error.message : "تعذر التحديث", true); } finally { setBusy(""); } }} className="icon-button" aria-label="تحديث البيانات"><RefreshCw className={`size-4 ${busy === "refresh" ? "animate-spin" : ""}`} /></button><button onClick={logout} className="secondary-button py-2 text-[10px] lg:hidden"><LogOut className="size-3.5" /> خروج</button></div></header>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mt-7">
                {tab === "overview" && <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
                    { label: "إجمالي المستخدمين", value: data.metrics.totalUsers, detail: `${data.metrics.activeUsers} حساب نشط`, icon: Users },
                    { label: "بانتظار التفعيل", value: data.metrics.pendingUsers, detail: "يحتاجون كوداً من المطور", icon: KeyRound },
                    { label: "إيداعات قيد المراجعة", value: data.metrics.pendingDeposits, detail: formatEgp(data.metrics.pendingDepositsEgp), icon: WalletCards },
                    { label: "إجمالي الاعتمادات", value: formatMoney(data.metrics.totalCreditedUsd), detail: `${data.metrics.suspendedUsers} حسابات موقوفة`, icon: Activity },
                  ].map((metric) => <div key={metric.label} className="rounded-[20px] border border-white/[0.07] bg-[#0d1815] p-5"><div className="flex items-center justify-between text-[10px] text-white/35">{metric.label}<metric.icon className="size-4 text-white/20" /></div><div className="mt-4 font-mono text-2xl" dir="ltr">{metric.value}</div><div className="mt-2 text-[9px] text-white/25">{metric.detail}</div></div>)}</div>
                  <div className="mt-5 grid gap-5 xl:grid-cols-2"><div className="rounded-[22px] border border-white/[0.07] bg-[#0d1815] p-5"><div className="flex items-center justify-between"><h2 className="text-sm">أحدث المستخدمين</h2><button onClick={() => setTab("users")} className="text-[10px] text-lime-300/60">عرض الكل</button></div><div className="mt-4 space-y-2">{data.users.filter((user) => user.role === "user").slice(0, 5).map((user) => <div key={user.id} className="flex items-center gap-3 rounded-xl bg-white/[0.02] p-3"><span className="grid size-8 place-items-center rounded-lg bg-white/[0.04] text-[10px] text-lime-300/60">{user.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><div className="truncate text-[11px] text-white/65">{user.name}</div><div className="truncate font-mono text-[8px] text-white/25" dir="ltr">{user.email}</div></div><span className={`user-status-${user.status}`}>{userStatus[user.status]}</span></div>)}</div></div><div className="rounded-[22px] border border-white/[0.07] bg-[#0d1815] p-5"><div className="flex items-center justify-between"><h2 className="text-sm">طلبات تحتاج قرارك</h2><button onClick={() => setTab("deposits")} className="text-[10px] text-lime-300/60">المراجعة</button></div>{pendingDeposits.length ? <div className="mt-4 space-y-2">{pendingDeposits.slice(0, 4).map((deposit) => <div key={deposit.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3"><div><div className="text-[11px] text-white/65">{deposit.userName}</div><div className="mt-1 font-mono text-[8px] text-white/25" dir="ltr">DEP-{deposit.id}</div></div><div className="font-mono text-xs text-amber-200" dir="ltr">{formatEgp(deposit.amountEgp)}</div></div>)}</div> : <p className="mt-8 text-center text-[11px] text-white/25">لا توجد طلبات معلقة. كل شيء تحت السيطرة.</p>}</div></div>
                </>}

                {(tab === "users" || tab === "codes") && <>
                  <div className="flex flex-col gap-3 rounded-[18px] border border-white/[0.07] bg-[#0d1815] p-3 sm:flex-row sm:items-center"><label className="relative flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/25" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="field pr-10" placeholder="ابحث بالاسم أو البريد" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="field sm:w-48"><option value="all">كل الحالات</option><option value="pending">بانتظار التفعيل</option><option value="active">نشط</option><option value="suspended">موقوف</option></select><button onClick={exportUsers} className="secondary-button justify-center py-3 text-[10px]"><Download className="size-3.5" /> تصدير</button></div>
                  <div className="mt-4 overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0d1815]"><div className="overflow-x-auto"><table className="data-table min-w-[1060px]"><thead><tr><th>المستخدم</th><th>الحالة</th><th>النقد / صافي الإيداع</th><th>الأوامر</th><th>الكود</th><th>التسجيل</th><th>إجراءات المطور</th></tr></thead><tbody>{filteredUsers.map((user) => <tr key={user.id}><td><div className="text-white/75">{user.name}{user.role === "developer" && <span className="mr-2 text-[8px] text-lime-300/50">مطور</span>}</div><div className="mt-1 font-mono text-[9px] text-white/30" dir="ltr">{user.email}</div></td><td><span className={`user-status-${user.status}`}>{userStatus[user.status]}</span></td><td className="font-mono" dir="ltr">{formatMoney(user.cash)}<span className="block text-[8px] text-white/25">net {formatMoney(user.netDeposits)}</span></td><td className="font-mono">{user.orderCount}</td><td>{user.codeStatus ? <span className={`code-status-${user.codeStatus}`}>{user.codeStatus === "active" ? "نشط" : user.codeStatus === "used" ? "مستخدم" : "معطّل"}</span> : "—"}</td><td>{formatDate(user.createdAt!, false)}</td><td>{user.role === "user" ? <div className="flex gap-1.5">{user.status === "pending" && <button disabled={busy === `code-${user.id}`} onClick={() => generateCode(user)} className="admin-action text-lime-300/70">{busy === `code-${user.id}` ? <LoaderCircle className="size-3 animate-spin" /> : <KeyRound className="size-3" />}{user.codeStatus ? "كود جديد" : "إنشاء كود"}</button>}{user.status !== "active" ? <button onClick={() => userAction(user, user.status === "suspended" ? "restore" : "activate")} className="admin-action"><UserCheck className="size-3" />تفعيل</button> : <button onClick={() => userAction(user, "suspend")} className="admin-action text-red-300/60"><Ban className="size-3" />إيقاف</button>}{tab === "users" && <button onClick={() => setAdjustUser(user)} className="admin-action"><Plus className="size-3" />تسوية رصيد</button>}{tab === "codes" && user.codeStatus === "active" && <button onClick={() => action(`disable-${user.id}`, "/api/admin/codes", { userId: user.id }).then((result) => result && notify("تم تعطيل الكود."))} className="admin-action text-red-300/60"><XCircle className="size-3" />تعطيل</button>}</div> : <span className="text-[9px] text-white/20">محمي</span>}</td></tr>)}</tbody></table></div>{!filteredUsers.length && <div className="grid min-h-48 place-items-center text-xs text-white/25">لا توجد نتائج مطابقة.</div>}</div>
                </>}

                {tab === "deposits" && <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0d1815]"><div className="overflow-x-auto"><table className="data-table min-w-[1050px]"><thead><tr><th>الطلب / المستخدم</th><th>المبلغ</th><th>محفظة الاستلام</th><th>الرقم المُرسِل</th><th>مرجع العملية</th><th>الحالة</th><th>المراجعة</th></tr></thead><tbody>{data.deposits.map((deposit) => <tr key={deposit.id}><td><div className="font-mono text-white/55" dir="ltr">DEP-{deposit.id}</div><div className="mt-1 text-white/70">{deposit.userName}</div><div className="mt-1 text-[8px] text-white/25">{formatDate(deposit.createdAt)}</div></td><td className="font-mono text-amber-200" dir="ltr">{formatEgp(deposit.amountEgp)}{deposit.creditedUsd > 0 && <span className="block text-[8px] text-lime-300/50">{formatMoney(deposit.creditedUsd)}</span>}</td><td className="font-mono" dir="ltr">{deposit.walletNumber}</td><td className="font-mono" dir="ltr">{deposit.senderNumber}</td><td className="max-w-40 truncate font-mono" dir="ltr" title={deposit.transferReference}>{deposit.transferReference}</td><td><span className={`deposit-status-${deposit.status}`}>{deposit.status === "pending" ? "قيد المراجعة" : deposit.status === "approved" ? "معتمد" : deposit.status === "rejected" ? "مرفوض" : "ملغي"}</span>{deposit.note && <div className="mt-1 max-w-40 truncate text-[8px] text-white/25" title={deposit.note}>{deposit.note}</div>}</td><td>{deposit.status === "pending" ? <div className="flex gap-2"><button onClick={() => setReview({ deposit, action: "approve" })} className="admin-action text-lime-300/70"><Check className="size-3" />اعتماد</button><button onClick={() => setReview({ deposit, action: "reject" })} className="admin-action text-red-300/60"><X className="size-3" />رفض</button></div> : <span className="text-[9px] text-white/20">تمت المراجعة</span>}</td></tr>)}</tbody></table></div>{!data.deposits.length && <div className="grid min-h-52 place-items-center text-xs text-white/25">لا توجد طلبات إيداع حتى الآن.</div>}</div>}

                {tab === "settings" && <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]"><div className="rounded-[22px] border border-white/[0.07] bg-[#0d1815] p-5 sm:p-6"><div className="flex items-center gap-3"><SlidersHorizontal className="size-5 text-lime-300/55" /><div><h2 className="text-sm">مفاتيح التشغيل</h2><p className="mt-1 text-[9px] text-white/25">تطبق على الطلبات الجديدة فور الحفظ</p></div></div><div className="mt-6 space-y-2">{([
                  ["registrationEnabled", "فتح إنشاء الحسابات", "السماح للمستخدمين الجدد بالتسجيل"], ["tradingEnabled", "تشغيل التداول", "إيقافه يمنع الأوامر والتنفيذ"], ["marketOrdersEnabled", "أوامر السوق", "السماح بالتنفيذ الفوري"], ["limitOrdersEnabled", "أوامر الحدّ", "السماح بالأوامر المشروطة"], ["maintenanceMode", "وضع الصيانة", "إيقاف التسجيل والتداول مع بقاء الاطلاع"],
                ] as const).map(([key, label, detail]) => <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.055] bg-white/[0.018] p-4"><div><div className="text-[11px] text-white/65">{label}</div><div className="mt-1 text-[9px] text-white/25">{detail}</div></div><button role="switch" aria-checked={settings[key]} onClick={() => setSettings((current) => ({ ...current, [key]: !current[key] }))} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${settings[key] ? "bg-lime-300" : "bg-white/10"}`}><motion.span animate={{ x: settings[key] ? -20 : 0 }} className="absolute right-1 top-1 size-5 rounded-full bg-white shadow" /></button></div>)}</div></div><div className="rounded-[22px] border border-white/[0.07] bg-[#0d1815] p-5 sm:p-6"><h2 className="text-sm">الحدود والقيم التشغيلية</h2><div className="mt-6 space-y-4">{([
                  ["maxOrderValueUsd", "الحد الأقصى لقيمة الأمر ($)"], ["minDepositEgp", "الحد الأدنى للإيداع (ج.م)"], ["egpPerUsd", "سعر الاعتماد: جنيه لكل دولار"], ["activationCodeHours", "صلاحية كود التفعيل بالساعات"],
                ] as const).map(([key, label]) => <label key={key} className="block"><span className="mb-2 block text-[10px] text-white/40">{label}</span><input type="number" min="0.01" step="any" value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: Number(event.target.value) }))} className="field font-mono" dir="ltr" /></label>)}</div><div className="mt-5 rounded-xl bg-amber-200/[0.05] p-3 text-[9px] leading-6 text-amber-100/45">سعر الاعتماد يدوي ويُستخدم عند الموافقة على الإيداع. راجعه قبل اعتماد أي تحويل؛ الطلبات السابقة لا تتغير.</div><button disabled={busy === "settings"} onClick={saveSettings} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 text-xs font-semibold text-[#0a130f] disabled:opacity-40">{busy === "settings" ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}حفظ وتطبيق الإعدادات</button></div></div>}

                {tab === "audit" && <div className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0d1815]"><div className="border-b border-white/[0.06] p-5 text-[10px] text-white/30">آخر 100 إجراء مسجل — لا يمكن تعديل السجل من الواجهة</div><div className="divide-y divide-white/[0.05]">{data.logs.map((log) => <div key={log.id} className="grid gap-3 p-4 sm:grid-cols-[150px_1fr_170px] sm:items-center sm:px-5"><div><div className="text-[11px] text-lime-200/60">{log.actorName}</div><div className="mt-1 font-mono text-[8px] text-white/20" dir="ltr">{log.action}</div></div><div className="text-[10px] leading-6 text-white/50">{log.details}</div><div className="text-[9px] text-white/25 sm:text-left">{formatDate(log.createdAt)}</div></div>)}{!data.logs.length && <div className="grid min-h-52 place-items-center text-xs text-white/25">سيظهر هنا كل إجراء إداري أو تفعيل.</div>}</div></div>}
              </motion.div>
            </AnimatePresence>
          </section>
        </div>

        <AnimatePresence>
          {generated && <Modal onClose={() => setGenerated(null)}><div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-lime-300/10 text-lime-300"><KeyRound className="size-5" /></span><h3 className="mt-5 text-xl">كود تفعيل {generated.name}</h3><p className="mt-3 text-[11px] leading-6 text-white/40">يظهر الكود الصريح هنا مرة واحدة فقط. انسخه وأرسله للمستخدم بنفسك.</p><div className="mt-6 rounded-2xl border border-lime-300/15 bg-black/20 py-5 font-mono text-4xl tracking-[0.35em] text-lime-200" dir="ltr">{generated.code}</div><div className="mt-3 text-[9px] text-white/25">تنتهي صلاحيته في {formatDate(generated.expiresAt)}</div><button onClick={async () => { await navigator.clipboard.writeText(generated.code); setCopied(true); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 text-xs font-semibold text-[#0a130f]">{copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}{copied ? "تم نسخ الكود" : "نسخ الكود"}</button></div></Modal>}
          {adjustUser && <Modal onClose={() => setAdjustUser(null)}><h3 className="text-xl">تسوية رصيد {adjustUser.name}</h3><p className="mt-2 text-[10px] text-white/35">الرصيد الحالي <span dir="ltr">{formatMoney(adjustUser.cash)}</span>. استخدم رقماً سالباً للخصم.</p><div className="mt-5 space-y-4"><label className="block"><span className="mb-2 block text-[10px] text-white/40">المبلغ بالدولار</span><input type="number" step="any" value={adjustAmount} onChange={(event) => setAdjustAmount(event.target.value)} className="field font-mono" dir="ltr" placeholder="100 أو -50" /></label><label className="block"><span className="mb-2 block text-[10px] text-white/40">سبب التسوية — إلزامي</span><textarea value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} className="field min-h-24 resize-none" placeholder="مثال: تصحيح قيمة إيداع بعد مراجعة الإيصال" /></label></div><button disabled={busy === "adjust" || !adjustAmount || adjustReason.length < 5} onClick={submitAdjustment} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-3.5 text-xs font-semibold text-[#0a130f] disabled:opacity-35">{busy === "adjust" && <LoaderCircle className="size-4 animate-spin" />}تأكيد التسوية وتسجيلها</button></Modal>}
          {review && <Modal onClose={() => setReview(null)}><h3 className="text-xl">{review.action === "approve" ? "اعتماد التحويل" : "رفض طلب الإيداع"}</h3><p className="mt-3 text-[11px] leading-7 text-white/40">{review.action === "approve" ? `سيتم إضافة ${formatMoney(Math.round((review.deposit.amountEgp / data.settings.egpPerUsd) * 100) / 100)} إلى حساب ${review.deposit.userName}. تأكد أولاً من وصول التحويل فعلياً إلى المحفظة.` : "لن يُضاف أي رصيد. سيظهر سبب الرفض في سجل طلب المستخدم."}</p><div className="mt-4 rounded-xl bg-white/[0.025] p-4 text-[10px] text-white/45"><span dir="ltr">DEP-{review.deposit.id} · {formatEgp(review.deposit.amountEgp)}</span><div className="mt-2 font-mono" dir="ltr">{review.deposit.transferReference}</div></div><label className="mt-4 block"><span className="mb-2 block text-[10px] text-white/40">{review.action === "approve" ? "ملاحظة اختيارية" : "سبب الرفض — إلزامي"}</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} className="field min-h-24 resize-none" /></label><button disabled={busy === "review" || (review.action === "reject" && reviewNote.length < 4)} onClick={submitReview} className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-semibold disabled:opacity-35 ${review.action === "approve" ? "bg-lime-300 text-[#0a130f]" : "bg-red-300 text-red-950"}`}>{busy === "review" && <LoaderCircle className="size-4 animate-spin" />}{review.action === "approve" ? "تأكيد الاستلام والاعتماد" : "تأكيد رفض الطلب"}</button></Modal>}
        </AnimatePresence>

        <div className="fixed bottom-5 left-5 z-[100] grid w-[calc(100%-2.5rem)] max-w-sm gap-2">{toasts.map((toast) => <motion.div key={toast.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className={`rounded-xl border p-4 text-[11px] leading-6 shadow-2xl backdrop-blur-xl ${toast.error ? "border-red-300/15 bg-red-950/90 text-red-100/70" : "border-lime-300/15 bg-[#102019]/95 text-white/65"}`}>{toast.message}</motion.div>)}</div>
      </main>
    </MotionConfig>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div role="dialog" aria-modal="true" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} className="relative w-full max-w-md rounded-[24px] border border-white/10 bg-[#101b17] p-6 shadow-2xl"><button onClick={onClose} className="icon-button absolute left-4 top-4" aria-label="إغلاق"><X className="size-4" /></button>{children}</motion.div></motion.div>;
}
