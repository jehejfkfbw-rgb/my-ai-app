import { useState } from "react";
import { Link2, LogOut, Moon, Plus, Search, Settings, Sun, UserSearch, Users } from "lucide-react";
import Logo from "./Logo";
import { Avatar, Btn } from "./ui";
import { showPhone, type Conv, type Profile } from "../lib/sb";

export default function Sidebar({ profile, convs, currentId, unread, onlineIds, dark, onToggleDark, onOpen, actions }: {
  profile: Profile | null;
  convs: Conv[];
  currentId?: string;
  unread: Record<string, number>;
  onlineIds: Set<string>;
  dark: boolean;
  onToggleDark: () => void;
  onOpen: (c: Conv) => void;
  actions: { findUser: () => void; findGroup: () => void; newGroup: () => void; joinCode: () => void; profile: () => void; logout: () => void };
}) {
  const [filter, setFilter] = useState("");
  const shown = convs.filter((c) => !filter || c.title.includes(filter));
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <aside className="w-full md:w-[340px] shrink-0 h-full flex flex-col bg-white dark:bg-[#0d2724] md:border-l border-grape-100 dark:border-white/10">
      {/* الهيدر */}
      <div className="bg-gradient-to-l from-grape-700 via-grape-600 to-grape-500 text-white px-3.5 py-3 flex items-center gap-2.5">
        <Logo size={36} animated={false} />
        <div className="flex-1 min-w-0">
          <div className="font-display font-extrabold leading-tight truncate">{profile?.display_name || "…"}</div>
          <div dir="ltr" className="text-[11px] text-white/70 text-right truncate">{showPhone(profile?.phone)}</div>
        </div>
        {totalUnread > 0 && (
          <span className="bg-candy-500 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center animate-pop">
            {totalUnread}
          </span>
        )}
        <button onClick={onToggleDark} title="الوضع الليلي" className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer">
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button onClick={actions.profile} title="بياناتي والمظهر" className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer">
          <Settings size={16} />
        </button>
        <button onClick={actions.logout} title="خروج" className="p-2 rounded-xl bg-white/15 hover:bg-red-500/80 transition cursor-pointer">
          <LogOut size={16} />
        </button>
      </div>

      {/* أدوات */}
      <div className="grid grid-cols-4 gap-1.5 p-2.5 border-b border-grape-100 dark:border-white/10">
        {[
          { icon: <UserSearch size={17} />, t: "بحث برقم", f: actions.findUser },
          { icon: <Search size={17} />, t: "مجموعة", f: actions.findGroup },
          { icon: <Plus size={17} />, t: "جديدة", f: actions.newGroup },
          { icon: <Link2 size={17} />, t: "كود دعوة", f: actions.joinCode },
        ].map((b, i) => (
          <button key={i} onClick={b.f}
            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-grape-50 hover:bg-grape-100 dark:bg-white/5 dark:hover:bg-white/10 text-grape-700 dark:text-grape-200 text-[11px] font-semibold transition cursor-pointer">
            {b.icon}{b.t}
          </button>
        ))}
      </div>

      {/* فلترة المحادثات (جديد) */}
      <div className="px-2.5 pt-2.5">
        <div className="relative">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-grape-400" />
          <input
            value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="فلتر محادثاتك…"
            className="w-full rounded-xl bg-grape-50 dark:bg-white/5 border border-transparent focus:border-grape-300 dark:focus:border-white/20 pr-9 pl-3 py-2 text-sm dark:text-grape-50 placeholder:text-grape-400/70"
          />
        </div>
      </div>

      {/* القائمة */}
      <div className="flex-1 overflow-y-auto nice-scroll p-2">
        {shown.length === 0 ? (
          <div className="text-center text-grape-400 dark:text-grape-300/60 text-sm px-5 py-10 leading-relaxed">
            {convs.length === 0 ? (
              <>
                <div className="text-4xl mb-3">🎧</div>
                لسه مفيش محادثات.
                <br />دوّر على حد برقمه أو اعمل مجموعة.
                <Btn className="mt-4 w-full" onClick={actions.findUser}>ابدأ أول محادثة</Btn>
              </>
            ) : "مفيش نتايج للفلتر ده"}
          </div>
        ) : shown.map((c) => (
          <button
            key={c.id} onClick={() => onOpen(c)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-right transition cursor-pointer mb-0.5 ${
              currentId === c.id
                ? "bg-gradient-to-l from-grape-100 to-grape-50 dark:from-grape-500/25 dark:to-grape-500/10 ring-1 ring-grape-200 dark:ring-grape-500/30"
                : "hover:bg-grape-50 dark:hover:bg-white/5"
            }`}
          >
            <Avatar name={c.title} online={!c.is_group && !!c.otherId && onlineIds.has(c.otherId)} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate text-grape-950 dark:text-grape-50">{c.title}</div>
              <div className="text-[11px] text-grape-400 dark:text-grape-300/60 flex items-center gap-1">
                {c.is_group ? (<><Users size={11} /> مجموعة{c.is_public ? " عامة" : ""}</>) : "محادثة خاصة"}
              </div>
            </div>
            {(unread[c.id] || 0) > 0 && (
              <span className="bg-gradient-to-l from-grape-500 to-candy-500 text-white text-[11px] font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center animate-pop">
                {unread[c.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="text-center text-[10px] text-grape-300 dark:text-grape-300/40 pb-2" dir="ltr">VibeChat · دردش على موجتك</div>
    </aside>
  );
}