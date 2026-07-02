# Bond

Bond is a warm, real-time MERN chat application with private 24-hour sessions, email OTP verification, Google sign-in, friend requests, blocking, direct chats, groups, presence, typing indicators, live notification toasts and notification sound support.

## Run locally

1. Install MongoDB and start it locally (or use a MongoDB Atlas URI).
2. Copy `server/.env.example` to `server/.env` and set a long random `JWT_SECRET`.
3. Copy `client/.env.example` to `client/.env`.
4. From the repository root run:

   ```bash
   npm install
   npm run install:all
   npm run dev
   ```

The client runs at `http://localhost:5173` and the API at `http://localhost:5000`.

## Email and Google configuration

- OTP email uses SMTP. For Gmail, use an App Password in `SMTP_PASS`, never your regular password. If SMTP is blank in development, the OTP appears in the API console and in the signup screen.
- Create a Web OAuth client in Google Cloud, allow `http://localhost:5173`, then set the same client ID in `server/.env` (`GOOGLE_CLIENT_ID`) and `client/.env` (`VITE_GOOGLE_CLIENT_ID`).
- In production, use HTTPS, a managed MongoDB database, exact CORS origins, and real SMTP credentials. Set `NODE_ENV=production`; secure cookies will then be HTTPS-only and development OTP disclosure is disabled.

Profile and group pictures currently accept hosted image URLs. The generated default avatar works without storage credentials; Cloudinary/S3 upload can be added later without changing the data model.

## Deploy on Render

Create a new **Blueprint** in Render from this repository; `render.yaml` configures one free Node web service for React, Express and Socket.IO. Enter `MONGO_URI`, SMTP values, and the Google Client ID when Render asks. Use the same Google ID for both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`. After the first deployment, set `CLIENT_URL` to the service URL, for example `https://bond-chat.onrender.com`, and redeploy.

In Google Cloud OAuth settings, add both the local and deployed origins:

- `http://localhost:5173`
- your Render URL, such as `https://bond-chat.onrender.com`

Render free services sleep while idle, so the first visit after inactivity and the first Socket.IO connection can take roughly a minute. Uploaded files are not persisted on Render's free filesystem; Bond therefore stores hosted image URLs/default generated avatars.
