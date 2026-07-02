import mongoose from "mongoose";

const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 50 },
    nameLower: { type: String, index: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, select: false },
    googleId: String,
    avatar: { type: String, default: "" },
    about: {
      type: String,
      default: "Hey there! I am using Bond.",
      maxlength: 140,
    },
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blocked: [{ type: Schema.Types.ObjectId, ref: "User" }],
    verified: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
userSchema.pre("save", function (next) {
  this.nameLower = this.name.toLocaleLowerCase();
  next();
});

const otpSchema = new Schema({
  email: { type: String, index: true },
  codeHash: String,
  name: String,
  passwordHash: String,
  avatar: String,
  expiresAt: { type: Date, expires: 0 },
  attempts: { type: Number, default: 0 },
});
const requestSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: "User" },
    to: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
  },
  { timestamps: true },
);
requestSchema.index({ from: 1, to: 1 }, { unique: true });
const conversationSchema = new Schema(
  {
    kind: { type: String, enum: ["direct", "group"], default: "direct" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    name: String,
    avatar: String,
    about: String,
    admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
    lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true },
);
const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      index: true,
    },
    sender: { type: Schema.Types.ObjectId, ref: "User" },
    kind: {
      type: String,
      enum: ["text", "moment", "system"],
      default: "text",
    },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    image: String,
    momentSeen: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);
const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation" },
    kind: {
      type: String,
      enum: ["message", "friend_request", "friend_accepted"],
      required: true,
    },
    text: { type: String, required: true, maxlength: 240 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
export const Otp = model("Otp", otpSchema);
export const FriendRequest = model("FriendRequest", requestSchema);
export const Conversation = model("Conversation", conversationSchema);
export const Message = model("Message", messageSchema);
export const Notification = model("Notification", notificationSchema);
