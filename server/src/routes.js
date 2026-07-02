import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";
import multer from "multer";
import { OAuth2Client } from "google-auth-library";
import { auth, cookieOptions, publicUser, setSession } from "./auth.js";
import {
  Conversation,
  FriendRequest,
  Message,
  Notification,
  Otp,
  User,
} from "./models.js";

const router = Router();
const avatarFor = (name) =>
  `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(name)}`;
const clean = (s) => String(s || "").trim();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    cb(
      file.mimetype.startsWith("image/")
        ? null
        : new Error("Only image files are allowed."),
      file.mimetype.startsWith("image/"),
    ),
});
const mailer = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

router.post("/auth/signup", async (req, res, next) => {
  try {
    const name = clean(req.body.name),
      email = clean(req.body.email).toLowerCase(),
      password = String(req.body.password || "");
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8)
      return res.status(400).json({
        message:
          "Use a valid name, email and password of at least 8 characters.",
      });
    if (await User.exists({ email }))
      return res
        .status(409)
        .json({ message: "That email is already registered." });
    const code = String(crypto.randomInt(100000, 999999));
    await Otp.deleteMany({ email });
    await Otp.create({
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12),
      avatar: clean(req.body.avatar) || avatarFor(name),
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 10 * 60000),
    });
    if (!process.env.SMTP_USER) {
      if (process.env.NODE_ENV === "production")
        throw Error("Email service is not configured");
      console.log(`[Bond development OTP] ${email}: ${code}`);
    } else
      await mailer().sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: "Your Bond verification code",
        text: `Your Bond verification code is ${code}. It expires in 10 minutes.`,
      });
    res.status(202).json({
      message: "Verification code sent.",
      devCode:
        process.env.NODE_ENV !== "production" && !process.env.SMTP_USER
          ? code
          : undefined,
    });
  } catch (e) {
    next(e);
  }
});
router.post("/auth/verify", async (req, res, next) => {
  try {
    const email = clean(req.body.email).toLowerCase(),
      otp = await Otp.findOne({ email });
    if (!otp || otp.expiresAt < new Date() || otp.attempts >= 5)
      return res
        .status(400)
        .json({ message: "Code expired. Please sign up again." });
    if (!(await bcrypt.compare(String(req.body.code || ""), otp.codeHash))) {
      otp.attempts++;
      await otp.save();
      return res.status(400).json({ message: "Incorrect verification code." });
    }
    const user = await User.create({
      name: otp.name,
      email,
      password: otp.passwordHash,
      avatar: otp.avatar,
      verified: true,
    });
    await otp.deleteOne();
    setSession(res, user.id);
    res.status(201).json(publicUser(user));
  } catch (e) {
    next(e);
  }
});
router.post("/auth/login", async (req, res) => {
  const user = await User.findOne({
    email: clean(req.body.email).toLowerCase(),
  }).select("+password");
  if (
    !user?.password ||
    !(await bcrypt.compare(String(req.body.password || ""), user.password))
  )
    return res.status(401).json({ message: "Email or password is incorrect." });
  setSession(res, user.id);
  res.json(publicUser(user));
});
router.post("/auth/google", async (req, res, next) => {
  try {
    const ticket = await new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
    ).verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const p = ticket.getPayload();
    if (!p.email_verified)
      return res.status(401).json({ message: "Google email is not verified." });
    let user = await User.findOne({ email: p.email });
    if (!user)
      user = await User.create({
        name: p.name,
        email: p.email,
        avatar: p.picture || avatarFor(p.name),
        googleId: p.sub,
        verified: true,
      });
    setSession(res, user.id);
    res.json(publicUser(user));
  } catch (e) {
    next(e);
  }
});
router.post("/auth/logout", auth, (req, res) => {
  res.clearCookie("bond_session", cookieOptions());
  res.json({ ok: true });
});
router.get("/me", auth, (req, res) => res.json(publicUser(req.user)));
router.patch("/me", auth, async (req, res) => {
  if (clean(req.body.name)) req.user.name = clean(req.body.name).slice(0, 50);
  if (req.body.about !== undefined)
    req.user.about = clean(req.body.about).slice(0, 140);
  if (clean(req.body.avatar)) req.user.avatar = clean(req.body.avatar);
  await req.user.save();
  res.json(publicUser(req.user));
});
router.post("/uploads/image", auth, upload.single("image"), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Choose an image file." });
  res.json({
    url: `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
  });
});
router.get("/notifications", auth, async (req, res) =>
  res.json(
    await Notification.find({ recipient: req.user.id })
      .populate("actor", "name avatar")
      .sort("-createdAt")
      .limit(100),
  ),
);
router.patch("/notifications/read", auth, async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { $set: { read: true } },
  );
  res.json({ ok: true });
});
router.get("/users/search", auth, async (req, res) => {
  const q = clean(req.query.q).toLocaleLowerCase();
  if (!q) return res.json([]);
  const users = await User.find({
    _id: { $ne: req.user.id },
    nameLower: { $regex: "^" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") },
  }).limit(20);
  const ids = users.map((u) => u._id);
  const relationships = await FriendRequest.find({
    $or: [
      { from: req.user.id, to: { $in: ids } },
      { to: req.user.id, from: { $in: ids } },
    ],
  }).sort("-updatedAt");
  const now = Date.now();
  const cooldownMs = 7 * 24 * 60 * 60 * 1000;
  res.json(
    users.map((user) => {
      const related = relationships.filter(
        (r) => String(r.from) === user.id || String(r.to) === user.id,
      );
      const pending = related.find((r) => r.status === "pending");
      const accepted = related.find((r) => r.status === "accepted");
      const declined = related.find((r) => r.status === "declined");
      let connectionStatus = "available";
      let retryAt;
      if (req.user.friends.some((id) => String(id) === user.id) || accepted)
        connectionStatus = "connected";
      else if (pending)
        connectionStatus =
          String(pending.from) === req.user.id
            ? "outgoing_pending"
            : "incoming_pending";
      else if (declined && declined.updatedAt.getTime() + cooldownMs > now) {
        connectionStatus = "declined_cooldown";
        retryAt = new Date(declined.updatedAt.getTime() + cooldownMs);
      }
      return { ...publicUser(user), connectionStatus, retryAt };
    }),
  );
});
router.get("/friends", auth, async (req, res) => {
  const u = await User.findById(req.user.id).populate("friends");
  res.json(u.friends.map(publicUser));
});
router.get("/requests", auth, async (req, res) => {
  await FriendRequest.updateMany(
    { to: req.user.id, from: { $in: req.user.friends }, status: "pending" },
    { $set: { status: "accepted" } },
  );
  res.json(
    await FriendRequest.find({ to: req.user.id, status: "pending" }).populate(
      "from",
      "name avatar about",
    ),
  );
});
router.post("/requests/:id", auth, async (req, res) => {
  const to = await User.findById(req.params.id);
  if (
    !to ||
    to.id === req.user.id ||
    req.user.blocked.some((x) => String(x) === to.id) ||
    to.blocked.some((x) => String(x) === req.user.id)
  )
    return res.status(400).json({ message: "Request is not allowed." });
  const pair = {
    $or: [
      { from: req.user.id, to: to.id },
      { from: to.id, to: req.user.id },
    ],
  };
  const relationships = await FriendRequest.find(pair).sort("-updatedAt");
  if (
    req.user.friends.some((id) => String(id) === to.id) ||
    relationships.some((r) => r.status === "accepted")
  ) {
    await Promise.all([
      User.findByIdAndUpdate(req.user.id, { $addToSet: { friends: to.id } }),
      User.findByIdAndUpdate(to.id, { $addToSet: { friends: req.user.id } }),
      FriendRequest.updateMany(pair, { $set: { status: "accepted" } }),
    ]);
    return res.status(409).json({
      message: "You are already connected.",
      connectionStatus: "connected",
    });
  }
  const pending = relationships.find((r) => r.status === "pending");
  if (pending)
    return res.status(409).json({
      message:
        String(pending.from) === req.user.id
          ? "Friend request is already pending."
          : "This person has already sent you a request.",
      connectionStatus:
        String(pending.from) === req.user.id
          ? "outgoing_pending"
          : "incoming_pending",
    });
  const declined = relationships.find((r) => r.status === "declined");
  const retryAt = declined
    ? new Date(declined.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;
  if (retryAt && retryAt > new Date())
    return res.status(429).json({
      message: `You can send another request after ${retryAt.toLocaleDateString()}.`,
      connectionStatus: "declined_cooldown",
      retryAt,
    });
  await FriendRequest.deleteMany(pair);
  const fr = await FriendRequest.create({ from: req.user.id, to: to.id });
  const n = await Notification.create({
    recipient: to.id,
    actor: req.user.id,
    kind: "friend_request",
    text: `${req.user.name} sent you a friend request.`,
  });
  req.app
    .get("io")
    .to(`user:${to.id}`)
    .emit("friend:request", {
      _id: fr.id,
      from: {
        _id: req.user.id,
        name: req.user.name,
        avatar: req.user.avatar,
        about: req.user.about,
      },
      notification: n,
    });
  res.status(201).json(fr);
});
router.patch("/requests/:id", auth, async (req, res) => {
  const fr = await FriendRequest.findOne({
    _id: req.params.id,
    to: req.user.id,
    status: "pending",
  });
  if (!fr) return res.status(404).json({ message: "Request not found." });
  fr.status = req.body.action === "accept" ? "accepted" : "declined";
  await fr.save();
  if (fr.status === "accepted") {
    const pair = {
      $or: [
        { from: fr.from, to: fr.to },
        { from: fr.to, to: fr.from },
      ],
    };
    await Promise.all([
      User.findByIdAndUpdate(fr.from, { $addToSet: { friends: fr.to } }),
      User.findByIdAndUpdate(fr.to, { $addToSet: { friends: fr.from } }),
      FriendRequest.updateMany(pair, { $set: { status: "accepted" } }),
    ]);
    const n = await Notification.create({
      recipient: fr.from,
      actor: req.user.id,
      kind: "friend_accepted",
      text: `${req.user.name} accepted your friend request.`,
    });
    req.app
      .get("io")
      .to(`user:${fr.from}`)
      .emit("friend:accepted", { user: publicUser(req.user), notification: n });
  }
  res.json(fr);
});
router.post("/block/:id", auth, async (req, res) => {
  await Promise.all([
    User.findByIdAndUpdate(req.user.id, {
      $addToSet: { blocked: req.params.id },
      $pull: { friends: req.params.id },
    }),
    User.findByIdAndUpdate(req.params.id, { $pull: { friends: req.user.id } }),
  ]);
  await FriendRequest.deleteMany({
    $or: [
      { from: req.user.id, to: req.params.id },
      { from: req.params.id, to: req.user.id },
    ],
  });
  res.json({ ok: true });
});
router.get("/blocked", auth, async (req, res) => {
  const user = await User.findById(req.user.id).populate(
    "blocked",
    "name avatar about",
  );
  res.json(user.blocked.map(publicUser));
});
router.delete("/block/:id", auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { blocked: req.params.id },
  });
  res.json({ ok: true });
});

router.get("/conversations", auth, async (req, res) =>
  res.json(
    await Conversation.find({ members: req.user.id })
      .populate("members", "name avatar about lastSeen")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "name" },
      })
      .sort("-updatedAt"),
  ),
);
router.post("/conversations/direct/:id", auth, async (req, res) => {
  if (!req.user.friends.some((x) => String(x) === req.params.id)) {
    const accepted = await FriendRequest.exists({
      status: "accepted",
      $or: [
        { from: req.user.id, to: req.params.id },
        { from: req.params.id, to: req.user.id },
      ],
    });
    if (!accepted)
      return res
        .status(403)
        .json({ message: "You can chat only with accepted friends." });
    await Promise.all([
      User.findByIdAndUpdate(req.user.id, {
        $addToSet: { friends: req.params.id },
      }),
      User.findByIdAndUpdate(req.params.id, {
        $addToSet: { friends: req.user.id },
      }),
    ]);
  }
  let c = await Conversation.findOne({
    kind: "direct",
    members: { $all: [req.user.id, req.params.id] },
    $expr: { $eq: [{ $size: "$members" }, 2] },
  }).populate("members", "name avatar about lastSeen");
  if (!c)
    c = await Conversation.create({ members: [req.user.id, req.params.id] });
  res
    .status(201)
    .json(await c.populate("members", "name avatar about lastSeen"));
});
router.post("/conversations/group", auth, async (req, res) => {
  const ids = [...new Set((req.body.members || []).map(String))];
  if (
    !ids.length ||
    ids.some((id) => !req.user.friends.some((f) => String(f) === id))
  )
    return res
      .status(403)
      .json({ message: "Groups can contain only your accepted friends." });
  const c = await Conversation.create({
    kind: "group",
    name: clean(req.body.name).slice(0, 60) || "New Bond",
    avatar: clean(req.body.avatar) || avatarFor(req.body.name || "Bond"),
    about: clean(req.body.about).slice(0, 140),
    members: [req.user.id, ...ids],
    admins: [req.user.id],
  });
  res
    .status(201)
    .json(await c.populate("members", "name avatar about lastSeen"));
});
router.get("/conversations/:id/messages", auth, async (req, res) => {
  const c = await Conversation.findOne({
    _id: req.params.id,
    members: req.user.id,
  });
  if (!c) return res.status(404).json({ message: "Conversation not found." });
  const messages = await Message.find({ conversation: c.id })
    .populate("sender", "name avatar")
    .sort({ createdAt: 1 })
    .limit(200);
  await Message.updateMany(
    { conversation: c.id },
    { $addToSet: { readBy: req.user.id } },
  );
  res.json(messages);
});
router.post("/conversations/:id/messages", auth, async (req, res) => {
  const c = await Conversation.findOne({
    _id: req.params.id,
    members: req.user.id,
  });
  const kind = req.body.kind === "moment" ? "moment" : "text";
  const text =
    kind === "moment" ? "Shared a moment" : clean(req.body.text);
  const image = clean(req.body.image);
  if (!c || !text || (kind === "moment" && !image))
    return res.status(400).json({ message: "Message cannot be sent." });
  if (c.kind === "direct") {
    const other = c.members.find((x) => String(x) !== req.user.id);
    if (!req.user.friends.some((x) => String(x) === String(other)))
      return res.status(403).json({ message: "You are no longer friends." });
  }
  let m = await Message.create({
    conversation: c.id,
    sender: req.user.id,
    kind,
    text,
    image: kind === "moment" ? image : undefined,
    readBy: [req.user.id],
  });
  c.lastMessage = m.id;
  await c.save();
  m = await m.populate("sender", "name avatar");
  const io = req.app.get("io");
  for (const member of c.members) {
    if (String(member) === req.user.id) {
      io.to(`user:${member}`).emit("message:new", {
        conversationId: c.id,
        message: m,
      });
      continue;
    }
    const n = await Notification.create({
      recipient: member,
      actor: req.user.id,
      conversation: c.id,
      kind: "message",
      text: text.slice(0, 240),
    });
    io.to(`user:${member}`).emit("message:new", {
      conversationId: c.id,
      message: m,
      notification: n,
    });
  }
  res.status(201).json(m);
});
router.patch("/messages/:id/moment-seen", auth, async (req, res) => {
  let m = await Message.findById(req.params.id);
  if (!m || m.kind !== "moment" || m.momentSeen)
    return res.status(404).json({ message: "Moment is no longer available." });
  const c = await Conversation.findOne({
    _id: m.conversation,
    members: req.user.id,
  });
  if (!c) return res.status(404).json({ message: "Moment not found." });
  if (String(m.sender) === req.user.id)
    return res.status(403).json({ message: "Only the receiver can open this moment." });
  m.kind = "system";
  m.text = "Moment has been seen";
  m.image = undefined;
  m.momentSeen = true;
  m.readBy.addToSet(req.user.id);
  await m.save();
  m = await m.populate("sender", "name avatar");
  req.app
    .get("io")
    .to(`conversation:${c.id}`)
    .emit("message:update", { conversationId: c.id, message: m });
  for (const member of c.members)
    req.app
      .get("io")
      .to(`user:${member}`)
      .emit("message:update", { conversationId: c.id, message: m });
  res.json(m);
});

export default router;
