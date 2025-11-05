import { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useI18n } from '../../i18n';

/** ========================================================================
 * FAQ / intent bank (EN + MY keywords). Keep answers short & actionable.
 * ======================================================================= */
const FAQ = [
  // ==== CLAIM PROCESS ====
  { q: ['how claim','claim item','tuntut','cara tuntut'],
    a: 'Open Lost Item → click “Claim”. You will receive an 8-char unlock code via email. Enter it on the box within 5 minutes.' },
  { q: ['get unlock code','where code','kod buka','dapat kod'],
    a: 'The unlock code is emailed to your registered email immediately after you click “Claim”.' },
  { q: ['code not working','wrong code','invalid code','kod salah'],
    a: 'Double-check you entered all 8 characters correctly. Codes expire after 5 minutes; request a new one if needed.' },
  { q: ['multiple claim','claim twice','duplicate','double claim'],
    a: 'Each lost item can only be claimed once. If another user has already claimed it, you’ll see “In Use”.' },
  { q: ['cancel claim','stop claim','batalkan tuntutan'],
    a: 'You can cancel your claim before expiry. Go to Lost Item → Cancel Unlock.' },

  // ==== LOST ITEMS ====
  { q: ['how long item stored','berapa lama barang simpan','storage period'],
    a: 'Items are usually stored for 14 days. After that, unclaimed items are moved to HEP (Student Affairs).' },
  { q: ['item not listed','barang tiada dalam senarai'],
    a: 'If your item isn’t listed, it hasn’t been found or uploaded yet. Check again later or contact HEP.' },
  { q: ['damaged item','barang rosak'],
    a: 'Please report damaged items to HEP via the Report form in Help Center.' },

  // ==== SYSTEM / BOX ====
  { q: ['camera not working','gambar tiada','esp32 cam error'],
    a: 'The ESP32-CAM automatically uploads snapshots. If you don’t see a picture, report the issue to admin.' },
  { q: ['lock stuck','cannot open box','pintu tak buka'],
    a: 'Ensure your code is valid and entered within 5 minutes. If it still fails, report to HEP.' },
  { q: ['power down','no electricity','box off'],
    a: 'If the box loses power, claims pause temporarily. Items remain safe inside until power is restored.' },

  // ==== ACCOUNT ====
  { q: ['login fail','cannot login','gagal log masuk'],
    a: 'Check your email & password. If forgotten, reset via “Forgot Password”.' },
  { q: ['verify email','not receive email','tiada emel'],
    a: 'Check your spam folder. Or go to Settings → Security → Resend Verification.' },

  // ==== NOTIFICATIONS ====
  { q: ['not get email','emel tiada','missing notif'],
    a: 'Please check spam/junk. Also enable Email Notifications in Settings → Notifications.' },
  { q: ['bell icon','locate notif','notifikasi dalam app'],
    a: 'All in-app notifications appear under the bell icon at the top right.' },

  // ==== SECURITY & RULES ====
  { q: ['who can claim','anyone claim','sesiapa boleh'],
    a: 'Only logged-in, verified users can claim. Each claim is tied to your account.' },
  { q: ['admin approve','tuntutan perlu lulus'],
    a: 'Claims are automatic. Admins only intervene if there’s a conflict or report.' },

  // ==== HEP REPORTING ====
  { q: ['report hep','lapor hep','aduan','salah ambil'],
    a: 'You can submit a “Report to HEP” form from Help Center. Provide your name, Student ID, and description.' },
  { q: ['what hep do','tugas hep','peranan hep'],
    a: 'HEP investigates disputes (e.g., wrong claimant) and can return items manually.' },

  // ==== GENERAL ====
  { q: ['working hours','operating time','jam buka'],
    a: 'The ItemCloud system is available 24/7. HEP office hours are Mon–Fri, 9am–5pm.' },
  { q: ['mobile view','phone support','guna fon'],
    a: 'Yes, ItemCloud web app is mobile-friendly and works on smartphones.' },

  // ==== FALLBACK (topic rejection) ====
  { q: ['weather','joke','sing song','random'],
    a: 'Sorry, I only answer questions about ItemCloud Lost & Found.' },
];

/** polite / small-talk intents (localized) */
function smallTalkOrNull(s, t) {
  if (/(^|\s)(hi|hello|hey|salam|hai)\b/i.test(s)) return t('help.chat.greet', 'Hello 👋 How can I assist you today?');
  if (/(thank(s)?|terima kasih|tq)/i.test(s)) return t('help.chat.thanks', "You're welcome! 😊");
  if (/(good day|selamat pagi|selamat petang|selamat malam)/i.test(s)) return t('help.chat.goodDay', 'Have a great day! 🌟');
  return null;
}

/** keyword matcher */
function matchAnswer(text, t) {
  const s = (text || '').toLowerCase();
  const polite = smallTalkOrNull(s, t);
  if (polite) return polite;

  for (const f of FAQ) {
    if (f.q.some((k) => s.includes(k))) return f.a;
  }
  return null;
}

export default function ChatAssistantWidget() {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([
    {
      role: 'bot',
      text: t('help.aiHello', 'Hi! Ask me about ItemCloud. I can help with claiming, codes, and reports to HEP.'),
    },
  ]);
  const [msg, setMsg] = useState('');

  const boxRef = useRef(null);
  const nodeRef = useRef(null); // for React 18 StrictMode (avoids findDOMNode warning)

  useEffect(() => {
    if (open) boxRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [open, entries.length]);

  function send() {
    if (!msg.trim()) return;
    const userText = msg.trim();
    setEntries((e) => [...e, { role: 'me', text: userText }]);
    setMsg('');

    const found = matchAnswer(userText, t);
    const answer =
      found ||
      t(
        'help.aiFallback',
        'Hmm, I’m not sure. Try “Report to HEP” in Help Center or ask something like “how claim”, “code expired”.'
      );

    setTimeout(() => setEntries((e) => [...e, { role: 'bot', text: answer }]), 180);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="fixed bottom-5 right-5 md:bottom-6 md:right-6 btn-primary glow-interactive rounded-full w-12 h-12 flex items-center justify-center"
        aria-label="Open assistant"
        onClick={() => setOpen((v) => !v)}
        style={{ borderRadius: 9999 }}
      >
        ?
      </button>

      {/* Draggable panel */}
      {open && (
        <Draggable
          nodeRef={nodeRef}
          handle=".chat-drag-handle"
          cancel="input,textarea,button,.no-drag"
          defaultPosition={{ x: 0, y: 0 }}
        >
          <div
            ref={nodeRef}
            className="
              fixed bottom-24 right-5 md:bottom-28 md:right-6
              w-[min(92vw,22rem)] glass rounded-xl shadow-xl
              z-[9998] flex flex-col notif-panel
            "
          >
            {/* Header */}
            <div className="chat-drag-handle cursor-move px-4 py-3 border-b rounded-t-xl text-sm font-medium flex items-center justify-between">
              <span>{t('help.aiTitle', 'Ask ItemCloud')}</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border px-2 py-1 leading-none"
                aria-label={t('common.close', 'Close')}
                title={t('common.close', 'Close')}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div ref={boxRef} className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
              {entries.map((e, i) => (
                <div key={i} className={e.role === 'me' ? 'text-right' : 'text-left'}>
                  <span
                    className={`inline-block px-3 py-2 rounded-xl text-sm ${
                      e.role === 'me' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {e.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="p-3 border-t flex items-center gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-lg border dark:bg-slate-800 text-sm"
                placeholder={t('help.aiPlaceholder', 'Type a question…')}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={send}>
                {t('common.send', 'Send')}
              </button>
            </div>
          </div>
        </Draggable>
      )}
    </>
  );
}
