import jwt from 'jsonwebtoken';
import { User } from './models.js';

export const publicUser = u => ({ id: String(u._id), name: u.name, email: u.email, avatar: u.avatar, about: u.about, friends: u.friends?.map(String) || [], blocked: u.blocked?.map(String) || [], lastSeen: u.lastSeen });
export const signToken = id => jwt.sign({ sub: String(id) }, process.env.JWT_SECRET, { expiresIn: '24h' });
export const cookieOptions = () => ({ httpOnly: true, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 });
export const setSession = (res, id) => res.cookie('bond_session', signToken(id), cookieOptions());
export async function auth(req, res, next) {
  try { const token = req.cookies.bond_session || req.headers.authorization?.replace('Bearer ', ''); const data = jwt.verify(token, process.env.JWT_SECRET); req.user = await User.findById(data.sub); if (!req.user) throw Error(); next(); }
  catch { res.status(401).json({ message: 'Please sign in again.' }); }
}
export function socketAuth(socket, next) {
  try { const raw = socket.handshake.headers.cookie || ''; const token = raw.split(';').map(x => x.trim()).find(x => x.startsWith('bond_session='))?.split('=')[1] || socket.handshake.auth?.token; socket.userId = jwt.verify(token, process.env.JWT_SECRET).sub; next(); }
  catch { next(new Error('Unauthorized')); }
}
