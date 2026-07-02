import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  LogOut,
  Menu,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Settings,
  Smile,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, BASE, uploadImage } from "./api";

const QUOTE =
  "Time is precious, but sharing it with family and friends is priceless.";
const CONTACT_NAME = "Aditya Gavhane";
const CONTACT_PHONE = "7387571927";
const EMOJIS = [
  "😀",
  "😂",
  "😊",
  "😍",
  "🥰",
  "😎",
  "😢",
  "😡",
  "👍",
  "🙏",
  "👏",
  "❤️",
  "🔥",
  "🎉",
  "✨",
  "💯",
  "🤝",
  "🙌",
  "😴",
  "🤔",
  "😅",
  "😭",
  "😘",
  "👌",
];
const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
const Avatar = ({ src, name, size = 44 }) => (
  <img
    className="avatar"
    style={{ width: size, height: size }}
    src={src}
    alt={name || "profile"}
  />
);
const initials = (n) =>
  (n || "Bond")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
const playChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext,
      ctx = new AudioCtx(),
      gain = ctx.createGain(),
      tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(660, ctx.currentTime);
    tone.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    tone.connect(gain);
    gain.connect(ctx.destination);
    tone.start();
    tone.stop(ctx.currentTime + 0.3);
  } catch {}
};
function Auth({ onLogin }) {
  const [mode, setMode] = useState("login"),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      avatar: "",
    }),
    [otp, setOtp] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [devCode, setDevCode] = useState("");
  const chooseSignupImage = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Profile picture must be smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatar: String(reader.result) }));
      setError("");
    };
    reader.onerror = () => setError("Could not read that image.");
    reader.readAsDataURL(file);
  };
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const d = await api("/auth/signup", { method: "POST", body: form });
        setDevCode(d.devCode || "");
        setMode("verify");
      } else if (mode === "verify")
        onLogin(
          await api("/auth/verify", {
            method: "POST",
            body: { email: form.email, code: otp },
          }),
        );
      else onLogin(await api("/auth/login", { method: "POST", body: form }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || mode === "verify") return;
    let tries = 0;
    const timer = setInterval(() => {
      const target = document.getElementById("googleBtn");
      if (!window.google || !target) {
        if (++tries > 100) clearInterval(timer);
        return;
      }
      clearInterval(timer);
      target.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (r) => {
          try {
            onLogin(
              await api("/auth/google", {
                method: "POST",
                body: { credential: r.credential },
              }),
            );
          } catch (e) {
            setError(e.message);
          }
        },
      });
      window.google.accounts.id.renderButton(target, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: mode === "signup" ? "signup_with" : "signin_with",
        width: 360,
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onLogin, mode]);
  return (
    <div className="authPage">
      <div className="authArt">
        <div className="brand big">
          <span>B</span>OND
        </div>
        <h1>
          Conversations that bring
          <br />
          people closer.
        </h1>
        <p>A warm, private place for the people who matter.</p>
        <div className="orbs">
          <i />
          <i />
          <i />
        </div>
      </div>
      <main className="authCard">
        <div className="mobileBrand brand">
          <span>B</span>OND
        </div>
        <h2>
          {mode === "login"
            ? "Welcome back"
            : mode === "verify"
              ? "Check your inbox"
              : "Create your Bond"}
        </h2>
        <p>
          {mode === "verify"
            ? `We sent a 6-digit code to ${form.email}`
            : mode === "login"
              ? "Sign in and pick up where you left off."
              : "Start meaningful conversations today."}
        </p>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>Your name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Aditya"
              />
              <label>
                Profile picture <small>(optional, maximum 2 MB)</small>
              </label>
              <div className="signupUpload">
                {form.avatar && (
                  <Avatar src={form.avatar} name={form.name} size={58} />
                )}
                <input
                  className="fileInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => chooseSignupImage(e.target.files?.[0])}
                />
              </div>
              {!form.avatar && (
                <small className="uploadHint">
                  If you skip this, Bond will create a friendly default avatar.
                </small>
              )}
            </>
          )}
          {mode !== "verify" && (
            <>
              <label>Email address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
              />
              <label>Password</label>
              <input
                required
                minLength="8"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </>
          )}
          {mode === "verify" && (
            <>
              <label>Verification code</label>
              <input
                className="otp"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
              {devCode && (
                <div className="devCode">
                  Development code: <b>{devCode}</b>
                </div>
              )}
            </>
          )}
          {error && <div className="error">{error}</div>}
          <button disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Send verification code"
                  : "Verify & join Bond"}
          </button>
        </form>
        {mode !== "verify" && (
          <>
            <div className="divider">
              <span>or continue with</span>
            </div>
            <div id="googleBtn" className="googleFallback">
              {import.meta.env.VITE_GOOGLE_CLIENT_ID
                ? "Loading Google sign-in…"
                : "Google sign-in is not configured"}
            </div>
            <p className="switch">
              {mode === "login" ? "New to Bond? " : "Already have an account? "}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError("");
                }}
              >
                {mode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          </>
        )}
        {mode === "verify" && (
          <button className="linkBtn" onClick={() => setMode("signup")}> 
            Use a different email
          </button>
        )}
        <div className="authContact">
          <span>Contact</span>
          <b>{CONTACT_NAME}</b>
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE}</a>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [me, setMe] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    api("/me")
      .then(setMe)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="splash">
        <div className="brand big">
          <span>B</span>OND
        </div>
      </div>
    );
  return me ? <ChatApp me={me} setMe={setMe} /> : <Auth onLogin={setMe} />;
}

function ChatApp({ me, setMe }) {
  const [convos, setConvos] = useState([]),
    [active, setActive] = useState(null),
    [messages, setMessages] = useState([]),
    [search, setSearch] = useState(""),
    [results, setResults] = useState([]),
    [friends, setFriends] = useState([]),
    [requests, setRequests] = useState([]),
    [blockedUsers, setBlockedUsers] = useState([]),
    [notifications, setNotifications] = useState([]),
    [panel, setPanel] = useState(null),
    [notice, setNotice] = useState(null),
    [online, setOnline] = useState({}),
    [typing, setTyping] = useState(false);
  const socketRef = useRef(),
    activeRef = useRef();
  activeRef.current = active;
  const refresh = () =>
    Promise.all([
      api("/conversations").then(setConvos),
      api("/friends").then(setFriends),
      api("/requests").then(setRequests),
      api("/blocked").then(setBlockedUsers),
      api("/notifications").then(setNotifications),
    ]);
  useEffect(() => {
    refresh();
    const s = io(BASE, { withCredentials: true });
    socketRef.current = s;
    s.on("message:new", ({ conversationId, message, notification }) => {
      if (notification) setNotifications((x) => [notification, ...x]);
      if (activeRef.current?._id === conversationId)
        setMessages((x) =>
          x.some((m) => m._id === message._id) ? x : [...x, message],
        );
      else {
        setNotice({ title: message.sender.name, text: message.text });
        playChime();
      }
      api("/conversations").then(setConvos);
    });
    s.on("message:update", ({ conversationId, message }) => {
      setMessages((items) =>
        activeRef.current?._id === conversationId
          ? items.map((item) => (item._id === message._id ? message : item))
          : items,
      );
      api("/conversations").then(setConvos);
    });
    s.on("friend:request", (r) => {
      setRequests((x) => [r, ...x]);
      if (r.notification) setNotifications((x) => [r.notification, ...x]);
      setNotice({
        title: "New friend request",
        text: `${r.from.name} wants to connect`,
      });
      playChime();
    });
    s.on("friend:accepted", (d) => {
      if (d.notification) setNotifications((x) => [d.notification, ...x]);
      setResults((items) =>
        items.map((item) =>
          item.id === d.user?.id
            ? { ...item, connectionStatus: "connected" }
            : item,
        ),
      );
      refresh();
      api("/me").then(setMe);
      setNotice({
        title: "Friend request accepted",
        text: "You can now start chatting.",
      });
      playChime();
    });
    s.on("presence", (p) => setOnline((x) => ({ ...x, [p.userId]: p.online })));
    s.on("presence:init", (ids) =>
      setOnline(Object.fromEntries((ids || []).map((id) => [id, true]))),
    );
    s.on("typing", (p) => {
      if (p.conversationId === activeRef.current?._id) {
        setTyping(p.isTyping);
        setTimeout(() => setTyping(false), 1500);
      }
    });
    return () => s.disconnect();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const t = setTimeout(
      () =>
        search.trim()
          ? api("/users/search?q=" + encodeURIComponent(search)).then(
              setResults,
            )
          : setResults([]),
      250,
    );
    return () => clearTimeout(t);
  }, [search]);
  const open = async (c) => {
    setActive(c);
    setPanel(null);
    socketRef.current?.emit("conversation:join", c._id);
    setMessages(await api(`/conversations/${c._id}/messages`));
  };
  const start = async (user) => {
    try {
      open(await api("/conversations/direct/" + user.id, { method: "POST" }));
      setSearch("");
    } catch (e) {
      setNotice({ title: "Connect first", text: e.message });
    }
  };
  const send = async (text) => {
    if (!text.trim()) return;
    await api(`/conversations/${active._id}/messages`, {
      method: "POST",
      body: { text },
    });
  };
  const sendMoment = async (file) => {
    if (!file || !active) return;
    try {
      const image = await uploadImage(file);
      await api(`/conversations/${active._id}/messages`, {
        method: "POST",
        body: { kind: "moment", image },
      });
    } catch (e) {
      setNotice({ title: "Moment not sent", text: e.message });
    }
  };
  const openMoment = async (message) => {
    try {
      const updated = await api(`/messages/${message._id}/moment-seen`, {
        method: "PATCH",
      });
      setMessages((items) =>
        items.map((item) => (item._id === updated._id ? updated : item)),
      );
    } catch (e) {
      setNotice({ title: "Moment unavailable", text: e.message });
    }
  };
  const accept = async (id, action) => {
    await api("/requests/" + id, { method: "PATCH", body: { action } });
    await Promise.all([refresh(), api("/me").then(setMe)]);
    if (search.trim())
      setResults(await api("/users/search?q=" + encodeURIComponent(search)));
  };
  const requestConnection = async (user) => {
    try {
      await api("/requests/" + user.id, { method: "POST" });
      setResults((items) =>
        items.map((item) =>
          item.id === user.id
            ? { ...item, connectionStatus: "outgoing_pending" }
            : item,
        ),
      );
      setNotice({
        title: "Request sent",
        text: `Invitation sent to ${user.name}`,
      });
    } catch (e) {
      const fresh = await api("/users/search?q=" + encodeURIComponent(search));
      setResults(fresh);
      setNotice({ title: "Connection status", text: e.message });
    }
  };
  const logout = async () => {
    await api("/auth/logout", { method: "POST" });
    setMe(null);
  };
  const showNotifications = async () => {
    setPanel("notifications");
    await api("/notifications/read", { method: "PATCH" });
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };
  const unblock = async (id) => {
    await api("/block/" + id, { method: "DELETE" });
    setBlockedUsers((users) => users.filter((user) => user.id !== id));
    setNotice({ title: "User unblocked", text: "You can connect with this person again." });
  };
  return (
    <div className="app">
      <header className="quoteBar">
        <div className="quoteText">
          <span>“</span>
          {QUOTE}
          <span>”</span>
        </div>
        <a className="developerContact" href={`tel:${CONTACT_PHONE}`}>
          Contact Developer: {CONTACT_NAME} · {CONTACT_PHONE}
        </a>
      </header>
      {notice && (
        <div className="toast">
          <Bell size={20} />
          <div>
            <b>{notice.title}</b>
            <p>{notice.text}</p>
          </div>
          <button onClick={() => setNotice(null)}>
            <X size={16} />
          </button>
        </div>
      )}
      <section className="shell">
        <aside className={"sidebar " + (active ? "mobileHidden" : "")}>
          <div className="sideHead">
            <div className="brand">
              <span>B</span>OND
            </div>
            <div>
              <button
                className="icon"
                title="Notifications"
                onClick={showNotifications}
              >
                <Bell />
                {notifications.some((n) => !n.read) && (
                  <em>{notifications.filter((n) => !n.read).length}</em>
                )}
              </button>
              <button
                className="icon"
                title="Friend requests"
                onClick={() => setPanel("requests")}
              >
                <UserPlus />
                {requests.length > 0 && <em>{requests.length}</em>}
              </button>
              <button
                className="icon"
                title="New group"
                onClick={() => setPanel("group")}
              >
                <Users />
              </button>
              <button
                className="icon"
                title="Profile"
                onClick={() => setPanel("profile")}
              >
                <Settings />
              </button>
              <button
                className="icon"
                title="Blocked users"
                onClick={() => setPanel("blocked")}
              >
                <ShieldOff />
              </button>
              <button className="icon" onClick={logout}>
                <LogOut />
              </button>
            </div>
          </div>
          <div className="search">
            <Search />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people by name"
            />
          </div>
          <div className="listTitle">
            <span>{search ? "PEOPLE" : "RECENT CHATS"}</span>
          </div>
          <div className="chatList">
            {search
              ? results.map((u) => (
                  <UserResult
                    key={u.id}
                    user={u}
                    onStart={() => start(u)}
                    onRequest={() => requestConnection(u)}
                    onRespond={() => setPanel("requests")}
                  />
                ))
              : convos.map((c) => (
                  <ChatRow
                    key={c._id}
                    c={c}
                    me={me}
                    active={active?._id === c._id}
                    online={online}
                    onClick={() => open(c)}
                  />
                ))}
            {!search && !convos.length && (
              <Empty text="Your conversations will appear here. Search for a friend to begin." />
            )}
          </div>
          <div className="meBar">
            <Avatar src={me.avatar} name={me.name} />
            <div>
              <b>{me.name}</b>
              <small>{me.about}</small>
            </div>
          </div>
        </aside>
        <main className={"conversation " + (!active ? "mobileHidden" : "")}>
          {active ? (
            <Conversation
              c={active}
              me={me}
              messages={messages}
              online={online}
              typing={typing}
              onBack={() => setActive(null)}
              onSend={send}
              onMoment={sendMoment}
              onOpenMoment={openMoment}
              onTyping={(v) =>
                socketRef.current?.emit("typing", {
                  conversationId: active._id,
                  isTyping: v,
                })
              }
              onInfo={() => setPanel("info")}
            />
          ) : (
            <Welcome />
          )}
        </main>
      </section>
      {panel && (
        <Modal
          type={panel}
          close={() => setPanel(null)}
          me={me}
          setMe={setMe}
          friends={friends}
          requests={requests}
          blockedUsers={blockedUsers}
          notifications={notifications}
          accept={accept}
          unblock={unblock}
          active={active}
          onCreated={(c) => {
            setConvos((x) => [c, ...x]);
            open(c);
          }}
        />
      )}
    </div>
  );
}

function UserResult({ user, onStart, onRequest, onRespond }) {
  const status = user.connectionStatus || "available";
  const cooldownDays = user.retryAt
    ? Math.max(1, Math.ceil((new Date(user.retryAt) - Date.now()) / 86400000))
    : 0;
  const action = {
    connected: { label: "Chat", click: onStart },
    outgoing_pending: { label: "Pending", disabled: true },
    incoming_pending: { label: "Respond", click: onRespond },
    declined_cooldown: { label: `Retry in ${cooldownDays}d`, disabled: true },
    available: { label: "Connect", click: onRequest },
  }[status];
  return (
    <div className="chatRow">
      <Avatar src={user.avatar} name={user.name} />
      <div className="chatText">
        <b>{user.name}</b>
        <small>{user.about}</small>
      </div>
      <button
        className="pill"
        disabled={action.disabled}
        onClick={action.click}
      >
        {action.label}
      </button>
    </div>
  );
}
function ChatRow({ c, me, onClick, online }) {
  const other =
      c.kind === "direct" ? c.members.find((x) => x._id !== me.id) : null,
    name = c.kind === "group" ? c.name : other?.name,
    avatar = c.kind === "group" ? c.avatar : other?.avatar;
  return (
    <button className="chatRow" onClick={onClick}>
      <span className="avatarWrap">
        <Avatar src={avatar} name={name} />
        {other && online[other._id] && <i />}
      </span>
      <div className="chatText">
        <div>
          <b>{name}</b>
          <time>
            {c.lastMessage &&
              formatTime(c.lastMessage.createdAt)}
          </time>
        </div>
        <small>
          {c.lastMessage
            ? `${c.lastMessage.sender?.name === me.name ? "You" : c.lastMessage.sender?.name}: ${c.lastMessage.text}`
            : c.kind === "group"
              ? `${c.members.length} members`
              : "Start a conversation"}
        </small>
      </div>
    </button>
  );
}
function Conversation({
  c,
  me,
  messages,
  online,
  typing,
  onBack,
  onSend,
  onMoment,
  onOpenMoment,
  onTyping,
  onInfo,
}) {
  const [text, setText] = useState(""),
    [showEmoji, setShowEmoji] = useState(false),
    momentInput = useRef(),
    end = useRef();
  const other =
      c.kind === "direct" ? c.members.find((x) => x._id !== me.id) : null,
    name = c.kind === "group" ? c.name : other?.name,
    avatar = c.kind === "group" ? c.avatar : other?.avatar;
  useEffect(
    () => end.current?.scrollIntoView({ behavior: "smooth" }),
    [messages],
  );
  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText("");
      setShowEmoji(false);
      onTyping(false);
    }
  };
  const addEmoji = (emoji) => {
    setText((current) => current + emoji);
    onTyping(true);
  };
  return (
    <>
      <div className="chatHead">
        <button className="back" onClick={onBack}>
          <ChevronLeft />
        </button>
        <Avatar src={avatar} name={name} />
        <button className="personTitle" onClick={onInfo}>
          <b>{name}</b>
          <small>
            {typing
              ? "typing…"
              : c.kind === "group"
                ? `${c.members.length} members`
                : online[other?._id]
                  ? "online"
                  : "tap for profile"}
          </small>
        </button>
        <button className="icon">
          <MoreVertical />
        </button>
      </div>
      <div className="messages">
        <div className="encryption">
          Messages are private between members of this Bond.
        </div>
        {messages.map((m) => (
          <div
            key={m._id}
            className={
              "message " +
              (m.sender._id === me.id ? "mine" : "theirs") +
              (m.kind === "system" ? " systemMessage" : "")
            }
          >
            {c.kind === "group" && m.sender._id !== me.id && (
              <b className="senderName">{m.sender.name}</b>
            )}
            {m.kind === "moment" && m.image ? (
              <button
                type="button"
                className="momentCard"
                onClick={() => {
                  if (m.sender._id !== me.id) {
                    window.open(m.image, "_blank", "noopener,noreferrer");
                    onOpenMoment(m);
                  }
                }}
              >
                <Camera />
                <b>{m.sender._id === me.id ? "Moment sent" : "Open moment"}</b>
                <small>
                  {m.sender._id === me.id
                    ? "Waiting to be seen"
                    : "One-time photo"}
                </small>
              </button>
            ) : (
              <span>{m.text}</span>
            )}
            <time>
              {formatTime(m.createdAt)}
              {m.sender._id === me.id && <Check size={14} />}
            </time>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={submit}>
        <input
          ref={momentInput}
          className="hiddenFile"
          type="file"
          accept="image/*"
          onChange={(e) => {
            onMoment(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="momentButton"
          title="Share moment"
          onClick={() => momentInput.current?.click()}
        >
          <Camera />
        </button>
        <div className="emojiWrap">
          <button
            type="button"
            className="emojiToggle"
            title="Add emoji"
            onClick={() => setShowEmoji((value) => !value)}
          >
            <Smile />
          </button>
          {showEmoji && (
            <div className="emojiPicker">
              {EMOJIS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping(true);
          }}
          onBlur={() => onTyping(false)}
          placeholder="Write a message…"
        />
        <button>
          <Send />
        </button>
      </form>
    </>
  );
}
function Welcome() {
  return (
    <div className="welcome">
      <div className="welcomeIcon">
        <MessageCircle />
      </div>
      <h2>Welcome to Bond</h2>
      <p>
        Select a conversation or search for a friend.
        <br />
        Good conversations make ordinary days memorable.
      </p>
      <div className="secure">Private · Real-time · Made for connection</div>
    </div>
  );
}
function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function Modal({
  type,
  close,
  me,
  setMe,
  friends,
  requests,
  blockedUsers,
  notifications,
  accept,
  unblock,
  active,
  onCreated,
}) {
  const [name, setName] = useState(me.name),
    [about, setAbout] = useState(me.about),
    [avatar, setAvatar] = useState(me.avatar),
    [selected, setSelected] = useState([]),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const chooseImage = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      setAvatar(await uploadImage(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    try {
      setMe(
        await api("/me", { method: "PATCH", body: { name, about, avatar } }),
      );
      close();
    } catch (e) {
      setError(e.message);
    }
  };
  const group = async () => {
    try {
      onCreated(
        await api("/conversations/group", {
          method: "POST",
          body: { name, about, avatar, members: selected },
        }),
      );
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section className="modal">
        <header>
          <button onClick={close}>
            <X />
          </button>
          <h3>
            {type === "profile"
              ? "Your profile"
              : type === "requests"
                ? "Friend requests"
                : type === "blocked"
                  ? "Blocked users"
                : type === "notifications"
                  ? "Notifications"
                  : type === "group"
                    ? "Create a group"
                    : "Conversation info"}
          </h3>
        </header>
        <div className="modalBody">
          {type === "profile" && (
            <>
              <div className="profileAvatar">
                <Avatar src={avatar} name={name} size={96} />
                <Camera />
              </div>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
              <label>About</label>
              <textarea
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={140}
              />
              <label>Profile picture</label>
              <input
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={(e) => chooseImage(e.target.files?.[0])}
              />
              <button className="primary" disabled={uploading} onClick={save}>
                {uploading ? "Uploading…" : "Save profile"}
              </button>
            </>
          )}
          {type === "requests" &&
            (requests.length ? (
              requests.map((r) => (
                <div className="request" key={r._id}>
                  <Avatar src={r.from.avatar} name={r.from.name} />
                  <div>
                    <b>{r.from.name}</b>
                    <small>{r.from.about}</small>
                  </div>
                  <button onClick={() => accept(r._id, "accept")}>
                    <Check />
                  </button>
                  <button onClick={() => accept(r._id, "decline")}>
                    <X />
                  </button>
                </div>
              ))
            ) : (
              <Empty text="No pending friend requests." />
            ))}
          {type === "blocked" &&
            (blockedUsers.length ? (
              blockedUsers.map((user) => (
                <div className="request" key={user.id}>
                  <Avatar src={user.avatar} name={user.name} />
                  <div>
                    <b>{user.name}</b>
                    <small>{user.about}</small>
                  </div>
                  <button className="unblockButton" onClick={() => unblock(user.id)}>
                    Unblock
                  </button>
                </div>
              ))
            ) : (
              <Empty text="You have not blocked anyone." />
            ))}
          {type === "notifications" &&
            (notifications.length ? (
              <div className="notificationList">
                {notifications.map((n) => (
                  <div
                    className={"historyNotice " + (!n.read ? "unread" : "")}
                    key={n._id}
                  >
                    <Avatar
                      src={n.actor?.avatar}
                      name={n.actor?.name || "Bond"}
                    />
                    <div>
                      <b>{n.actor?.name || "Bond"}</b>
                      <p>{n.text}</p>
                      <small>{new Date(n.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No notifications yet." />
            ))}
          {type === "group" && (
            <>
              <label>Group name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weekend crew"
              />
              <label>
                Group picture <small>(optional)</small>
              </label>
              <input
                className="fileInput"
                type="file"
                accept="image/*"
                onChange={(e) => chooseImage(e.target.files?.[0])}
              />
              <label>Group description</label>
              <input value={about} onChange={(e) => setAbout(e.target.value)} />
              <label>Choose friends</label>
              <div className="friendPicker">
                {friends.map((f) => (
                  <button
                    className={selected.includes(f.id) ? "picked" : ""}
                    onClick={() =>
                      setSelected((x) =>
                        x.includes(f.id)
                          ? x.filter((i) => i !== f.id)
                          : [...x, f.id],
                      )
                    }
                  >
                    <Avatar src={f.avatar} name={f.name} />
                    <span>{f.name}</span>
                    <Check />
                  </button>
                ))}
              </div>
              <button
                className="primary"
                disabled={uploading || !name.trim() || !selected.length}
                onClick={group}
              >
                Create group
              </button>
            </>
          )}
          {type === "info" && active && (
            <Info active={active} me={me} close={close} />
          )}{" "}
          {error && <div className="error">{error}</div>}
        </div>
      </section>
    </div>
  );
}
function Info({ active, me, close }) {
  const other =
    active.kind === "direct"
      ? active.members.find((x) => x._id !== me.id)
      : null;
  const block = async () => {
    if (confirm(`Block ${other.name}? You will no longer be friends.`)) {
      await api("/block/" + other._id, { method: "POST" });
      close();
    }
  };
  return (
    <div className="infoCard">
      <Avatar
        size={110}
        src={active.kind === "group" ? active.avatar : other.avatar}
      />
      <h2>{active.kind === "group" ? active.name : other.name}</h2>
      <p>{active.kind === "group" ? active.about : other.about}</p>
      {active.kind === "group" ? (
        <div className="members">
          <b>{active.members.length} members</b>
          {active.members.map((m) => (
            <div>
              <Avatar src={m.avatar} name={m.name} />
              <span>
                {m.name}
                {m._id === me.id ? " (you)" : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <button className="danger" onClick={block}>
          Block {other.name}
        </button>
      )}
    </div>
  );
}
export default App;
