require("dotenv").config();

const crypto = require("crypto");

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
} = process.env;

const BASE_URL = (
  process.env.BASE_URL ||
  process.env.PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
).replace(/\/+$/, "");

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildVerifyLink(token) {
  return `${BASE_URL}/src/verify-email?token=${encodeURIComponent(token)}`;
}

function buildResetLink(token) {
  return `${BASE_URL}/src/reset-password?token=${encodeURIComponent(token)}`;
}

function mailer() {
  const nodemailer = require("nodemailer");
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

async function sendMail({ to, subject, html }) {
  const transport = mailer();
  if (!transport) {
    console.log(
      `[email] SMTP not configured – not sending "${subject}" to ${to}. Configure SMTP_HOST in .env.`,
    );
    return { skipped: true };
  }
  try {
    const info = await transport.sendMail({
      from: SMTP_FROM || "Sunesis <no-reply@sunesis.local>",
      to,
      subject,
      html,
    });
    console.log(`[email] Sent "${subject}" to ${to} (${info.messageId})`);
    return { messageId: info.messageId };
  } catch (error) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error.message);
    console.log(`[email] SMTP unavailable – the link would have been: see logs`);
    return { skipped: true, error: error.message };
  }
}

function layout(title, bodyHtml) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;background:#fbf5f4;font-family:Arial,Helvetica,sans-serif;color:#2b1416;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="font-size:22px;font-weight:800;letter-spacing:-.5px;background:linear-gradient(90deg,#b22222 0%,#7a1e4e 48%,#1b1462 80%,#00185c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;">sunesis</span>
      </div>
      <div style="background:#ffffff;border:1px solid #f0dfdd;border-radius:14px;padding:28px 26px;">
        ${bodyHtml}
      </div>
      <p style="color:#8c7073;font-size:12px;line-height:1.6;text-align:center;margin:22px 0 0;">
        Sunesis &middot; A clearer way to learn<br/>
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>`;
}

function buttonHref(href, text) {
  return `<a href="${href}" style="display:inline-block;background:#b22222;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:9px;">${text}</a>`;
}

function sendVerificationEmail({ email, username, token }) {
  const link = buildVerifyLink(token);
  return sendMail({
    to: email,
    subject: "Verify your Sunesis email",
    html: layout("Verify your email", `
      <h1 style="color:#571313;font-size:20px;margin:0 0 10px;">Verify your email</h1>
      <p style="color:#8c7073;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hi ${username || "there"},<br/>
        Welcome to Sunesis. Tap the button below to verify your email address and complete your registration.
      </p>
      <div style="text-align:center;margin:0 0 20px;">${buttonHref(link, "Verify email")}</div>
      <p style="color:#8c7073;font-size:12px;line-height:1.7;margin:0;word-break:break-all;">
        Or copy this link into your browser:<br/>${link}
      </p>
      <p style="color:#b99b98;font-size:12px;margin:16px 0 0;">This link expires in 24 hours.</p>
    `),
  });
}

function sendResetEmail({ email, username, token }) {
  const link = buildResetLink(token);
  return sendMail({
    to: email,
    subject: "Reset your Sunesis password",
    html: layout("Reset your password", `
      <h1 style="color:#571313;font-size:20px;margin:0 0 10px;">Reset your password</h1>
      <p style="color:#8c7073;font-size:14px;line-height:1.7;margin:0 0 20px;">
        Hi ${username || "there"},<br/>
        We received a request to reset your Sunesis password. Tap the button below to choose a new password.
      </p>
      <div style="text-align:center;margin:0 0 20px;">${buttonHref(link, "Reset password")}</div>
      <p style="color:#8c7073;font-size:12px;line-height:1.7;margin:0;word-break:break-all;">
        Or copy this link into your browser:<br/>${link}
      </p>
      <p style="color:#b99b98;font-size:12px;margin:16px 0 0;">This link expires in 1 hour.</p>
    `),
  });
}

module.exports = {
  generateToken,
  buildVerifyLink,
  buildResetLink,
  sendMail,
  sendVerificationEmail,
  sendResetEmail,
};