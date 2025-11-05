// src/lib/emailjsClient.ts
import emailjs from '@emailjs/browser';

// Use constants so you don’t reference import.meta.env inline:
const SERVICE_ID               = import.meta.env.VITE_EMAILJS_SERVICE_ID!;
const VERIFY_TEMPLATE_ID       = import.meta.env.VITE_EMAILJS_TEMPLATE_ID!;          // verification template
const UNLOCK_TEMPLATE_ID       = import.meta.env.VITE_EMAILJS_UNLOCK_TEMPLATE_ID!;   // unlock template
const PUBLIC_KEY               = import.meta.env.VITE_EMAILJS_PUBLIC_KEY!;

export async function sendVerifyEmail(params: {
  to_email: string;
  to_name: string;
  app_name: string;
  verification_url: string;
}) {
  const { to_email, to_name, app_name, verification_url } = params;
  if (!to_email) throw new Error('Missing to_email for EmailJS');

  return emailjs.send(
    SERVICE_ID,
    VERIFY_TEMPLATE_ID,
    { to_email, to_name, app_name, verification_url },
    { publicKey: PUBLIC_KEY }
  );
}

export async function sendUnlockEmail({
  to_email,
  to_name,
  app_name,
  box,
  itemID,
  unlock_code,
  expires,               // human-readable absolute time string
  expires_in_minutes,    // number | string; we’ll stringify
}: {
  to_email: string;
  to_name: string;
  app_name: string;
  box: string;
  itemID: string;
  unlock_code: string;
  expires: string;
  expires_in_minutes: number | string;
}) {
  return emailjs.send(
    SERVICE_ID,
    UNLOCK_TEMPLATE_ID,
    {
      to_email,
      to_name,
      app_name,
      box,
      itemID,
      unlock_code,
      expires,                           // e.g. "Sep 13, 2025, 10:33 PM"
      expires_in_minutes: String(expires_in_minutes),
    },
    { publicKey: PUBLIC_KEY }
  );
}
