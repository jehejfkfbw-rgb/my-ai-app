import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Avatar } from "./ui";
import { sb } from "../lib/sb";

type CallKind = "voice" | "video";
interface CallState {
  peerId: string;
  peerName: string;
  kind: CallKind;
  dir: "in" | "out";
  status: "ringing" | "connecting" | "active";
}
interface Signal {
  t: "invite" | "answer" | "decline" | "busy" | "end" | "ice";
  from: string;
  name?: string;
  kind?: CallKind;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

const CallCtx = createContext<{ start: (uid: string, name: string, kind: CallKind) => void }>({ start: () => {} });
export const useCall = () => useContext(CallCtx);

const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };

/* نغمة رنين */
function makeRinger(incoming: boolean) {
  let ctx: AudioContext | null = null;
  let timer = 0;
  const play = () => {
    try {
      ctx = ctx || new AudioContext();
      const t = ctx.currentTime;
      const freqs = incoming ? [660, 880, 660, 880] : [440, 480];
      freqs.forEach((f, i) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.08, t + i * 0.18 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.16);
        o.connect(g).connect(ctx!.destination);
        o.start(t + i * 0.18);
        o.stop(t + i * 0.18 + 0.2);
      });
    } catch { /* ignore */ }
  };
  play();
  timer = window.setInterval(play, incoming ? 1600 : 2800);
  return () => { clearInterval(timer); ctx?.close().catch(() => {}); };
}

export default function CallLayer({ meId, myName, children, onToast }: {
  meId: string; myName: string; children: ReactNode; onToast: (t: string) => void;
}) {
  const [call, setCall] = useState<CallState | null>(null);
  const [secs, setSecs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [remoteVideo, setRemoteVideo] = useState(false);

  const callRef = useRef<CallState | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const iceBuf = useRef<RTCIceCandidateInit[]>([]);
  const pendingOffer = useRef<Signal | null>(null);
  const chRef = useRef<RealtimeChannel | null>(null);
  const peerChs = useRef(new Map<string, RealtimeChannel>());
  const stopRing = useRef<(() => void) | null>(null);
  const timers = useRef<{ timeout?: number; tick?: number }>({});
  const localVid = useRef<HTMLVideoElement | null>(null);
  const remoteVid = useRef<HTMLVideoElement | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  callRef.current = call;

  const send = useCallback(async (to: string, sig: Omit<Signal, "from">) => {
    let ch = peerChs.current.get(to);
    if (!ch) {
      ch = sb.channel("call-" + to);
      peerChs.current.set(to, ch);
      await new Promise<void>((res) => {
        const t = setTimeout(res, 4000);
        ch!.subscribe((s) => { if (s === "SUBSCRIBED") { clearTimeout(t); res(); } });
      });
    }
    ch.send({ type: "broadcast", event: "signal", payload: { ...sig, from: meId } });
  }, [meId]);

  const cleanup = useCallback(() => {
    stopRing.current?.(); stopRing.current = null;
    clearTimeout(timers.current.timeout);
    clearInterval(timers.current.tick);
    pcRef.current?.close(); pcRef.current = null;
    localStream.current?.getTracks().forEach((t) => t.stop());
    localStream.current = null;
    remoteStream.current = null;
    iceBuf.current = [];
    pendingOffer.current = null;
    setCall(null); setSecs(0); setMuted(false); setCamOff(false); setRemoteVideo(false);
  }, []);

  const startTimer = useCallback(() => {
    setSecs(0);
    timers.current.tick = window.setInterval(() => setSecs((s) => s + 1), 1000);
  }, []);

  const makePc = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection(ICE);
    pc.onicecandidate = (e) => { if (e.candidate) send(peerId, { t: "ice", candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      remoteStream.current = e.streams[0];
      if (e.track.kind === "video") setRemoteVideo(true);
      if (remoteVid.current) remoteVid.current.srcObject = e.streams[0];
      if (remoteAudio.current) { remoteAudio.current.srcObject = e.streams[0]; remoteAudio.current.play().catch(() => {}); }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "disconnected"].includes(pc.connectionState) && callRef.current?.status === "active") {
        onToast("المكالمة اتقطعت");
        send(peerId, { t: "end" });
        cleanup();
      }
    };
    pcRef.current = pc;
    return pc;
  }, [send, cleanup, onToast]);

  const getMedia = async (kind: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" ? { facingMode: "user" } : false });
    localStream.current = stream;
    setTimeout(() => { if (localVid.current) localVid.current.srcObject = stream; }, 50);
    return stream;
  };

  /* ---------- بدء مكالمة ---------- */
  const start = useCallback(async (uid: string, name: string, kind: CallKind) => {
    if (callRef.current) return onToast("في مكالمة شغالة بالفعل");
    if (uid === meId) return;
    try {
      const stream = await getMedia(kind);
      setCall({ peerId: uid, peerName: name, kind, dir: "out", status: "ringing" });
      stopRing.current = makeRinger(false);
      const pc = makePc(uid);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await send(uid, { t: "invite", name: myName, kind, sdp: offer });
      timers.current.timeout = window.setTimeout(() => {
        if (callRef.current?.status === "ringing") {
          send(uid, { t: "end" });
          onToast("محدش رد على المكالمة");
          cleanup();
        }
      }, 35000);
    } catch (e: any) {
      onToast("مش قادر أوصل للمايك/الكاميرا: " + (e.message || ""));
      cleanup();
    }
  }, [meId, myName, makePc, send, cleanup, onToast]);

  /* ---------- الرد ---------- */
  const accept = useCallback(async () => {
    const inv = pendingOffer.current;
    const cur = callRef.current;
    if (!inv || !cur) return;
    stopRing.current?.(); stopRing.current = null;
    try {
      const stream = await getMedia(cur.kind);
      setCall({ ...cur, status: "connecting" });
      const pc = makePc(cur.peerId);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      await pc.setRemoteDescription(inv.sdp!);
      for (const c of iceBuf.current) await pc.addIceCandidate(c).catch(() => {});
      iceBuf.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await send(cur.peerId, { t: "answer", sdp: answer });
      setCall((c) => (c ? { ...c, status: "active" } : c));
      startTimer();
    } catch (e: any) {
      onToast("مش قادر أوصل للمايك/الكاميرا: " + (e.message || ""));
      send(cur.peerId, { t: "end" });
      cleanup();
    }
  }, [makePc, send, cleanup, startTimer, onToast]);

  const hangup = useCallback((decline = false) => {
    const cur = callRef.current;
    if (cur) send(cur.peerId, { t: decline ? "decline" : "end" });
    cleanup();
  }, [send, cleanup]);

  /* ---------- قناة إشاراتي ---------- */
  useEffect(() => {
    const ch = sb.channel("call-" + meId);
    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const sig = payload as Signal;
      const cur = callRef.current;
      if (sig.t === "invite") {
        if (cur) { send(sig.from, { t: "busy" }); return; }
        pendingOffer.current = sig;
        setCall({ peerId: sig.from, peerName: sig.name || "مستخدم", kind: sig.kind || "voice", dir: "in", status: "ringing" });
        stopRing.current = makeRinger(true);
        timers.current.timeout = window.setTimeout(() => {
          if (callRef.current?.status === "ringing" && callRef.current.dir === "in") cleanup();
        }, 35000);
        return;
      }
      if (!cur || sig.from !== cur.peerId) return;
      if (sig.t === "answer") {
        stopRing.current?.(); stopRing.current = null;
        clearTimeout(timers.current.timeout);
        await pcRef.current?.setRemoteDescription(sig.sdp!);
        for (const c of iceBuf.current) await pcRef.current?.addIceCandidate(c).catch(() => {});
        iceBuf.current = [];
        setCall((c) => (c ? { ...c, status: "active" } : c));
        startTimer();
      } else if (sig.t === "ice") {
        if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(sig.candidate!).catch(() => {});
        else iceBuf.current.push(sig.candidate!);
      } else if (sig.t === "decline") {
        onToast(cur.peerName + " رفض المكالمة");
        cleanup();
      } else if (sig.t === "busy") {
        onToast(cur.peerName + " مشغول بمكالمة تانية");
        cleanup();
      } else if (sig.t === "end") {
        if (cur.status === "active") onToast("المكالمة انتهت");
        cleanup();
      }
    }).subscribe();
    chRef.current = ch;
    const peers = peerChs.current;
    return () => {
      sb.removeChannel(ch);
      peers.forEach((c) => sb.removeChannel(c));
      peers.clear();
    };
  }, [meId, send, cleanup, startTimer, onToast]);

  const toggleMute = () => {
    const v = !muted;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !v));
    setMuted(v);
  };
  const toggleCam = () => {
    const v = !camOff;
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !v));
    setCamOff(v);
  };

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const isVideo = call?.kind === "video";

  return (
    <CallCtx.Provider value={{ start }}>
      {children}
      {call && (
        <div className="fixed inset-0 z-[70] bg-grape-950 flex flex-col items-center justify-between text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,153,138,.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(255,107,74,.2),transparent_55%)]" />

          {/* فيديو الطرف التاني */}
          {isVideo && (
            <video ref={remoteVid} autoPlay playsInline
              className={`absolute inset-0 w-full h-full object-cover ${call.status === "active" && remoteVideo ? "" : "opacity-0"}`} />
          )}
          <audio ref={remoteAudio} autoPlay />

          {/* الرأس */}
          <div className="relative flex flex-col items-center gap-3 pt-14 animate-rise">
            {(!isVideo || call.status !== "active" || !remoteVideo) && (
              <div className="relative">
                {call.status === "ringing" && (
                  <>
                    <span className="absolute inset-0 rounded-3xl bg-grape-500/40 animate-ping" />
                    <span className="absolute -inset-3 rounded-[2rem] bg-candy-500/20 animate-pulse" />
                  </>
                )}
                <Avatar name={call.peerName} size={104} />
              </div>
            )}
            <div className={`text-center ${isVideo && call.status === "active" && remoteVideo ? "bg-black/40 rounded-2xl px-5 py-2 backdrop-blur-sm" : ""}`}>
              <div className="font-display font-black text-2xl">{call.peerName}</div>
              <div className="text-grape-200 text-sm mt-1 flex items-center justify-center gap-1.5">
                {isVideo ? <Video size={14} /> : <Phone size={14} />}
                {call.status === "active" ? (
                  <span dir="ltr" className="tabular-nums font-semibold text-emerald-300">{mmss}</span>
                ) : call.dir === "out" ? (
                  call.status === "connecting" ? "بيوصّل…" : "بيرن…"
                ) : (
                  `مكالمة ${isVideo ? "فيديو" : "صوتية"} واردة…`
                )}
              </div>
            </div>
          </div>

          {/* فيديو أنا */}
          {isVideo && (
            <video ref={localVid} autoPlay playsInline muted
              className={`absolute top-4 left-4 w-28 sm:w-36 rounded-2xl border-2 border-white/30 shadow-xl -scale-x-100 ${camOff ? "opacity-0" : ""}`} />
          )}

          {/* الأزرار */}
          <div className="relative pb-12 flex items-center gap-5 animate-rise">
            {call.status === "active" || (call.dir === "out" && call.status !== "ringing") || call.dir === "out" ? (
              <>
                <button onClick={toggleMute} className="flex flex-col items-center gap-1.5 cursor-pointer group">
                  <span className={`w-14 h-14 rounded-full flex items-center justify-center transition group-active:scale-90 ${muted ? "bg-white text-grape-900" : "bg-white/15 hover:bg-white/25"}`}>
                    {muted ? <MicOff size={22} /> : <Mic size={22} />}
                  </span>
                  <span className="text-[11px] text-grape-200">{muted ? "فتح المايك" : "كتم"}</span>
                </button>
                {isVideo && (
                  <button onClick={toggleCam} className="flex flex-col items-center gap-1.5 cursor-pointer group">
                    <span className={`w-14 h-14 rounded-full flex items-center justify-center transition group-active:scale-90 ${camOff ? "bg-white text-grape-900" : "bg-white/15 hover:bg-white/25"}`}>
                      {camOff ? <VideoOff size={22} /> : <Video size={22} />}
                    </span>
                    <span className="text-[11px] text-grape-200">{camOff ? "فتح الكاميرا" : "قفل الكاميرا"}</span>
                  </button>
                )}
              </>
            ) : null}

            {call.dir === "in" && call.status === "ringing" && (
              <button onClick={accept} className="flex flex-col items-center gap-1.5 cursor-pointer group">
                <span className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition group-active:scale-90 animate-bounce">
                  {isVideo ? <Video size={26} /> : <Phone size={26} />}
                </span>
                <span className="text-[11px] text-emerald-300 font-bold">رد</span>
              </button>
            )}

            <button onClick={() => hangup(call.dir === "in" && call.status === "ringing")} className="flex flex-col items-center gap-1.5 cursor-pointer group">
              <span className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition group-active:scale-90">
                <PhoneOff size={26} />
              </span>
              <span className="text-[11px] text-red-300 font-bold">
                {call.dir === "in" && call.status === "ringing" ? "رفض" : "إنهاء"}
              </span>
            </button>
          </div>
        </div>
      )}
    </CallCtx.Provider>
  );
}