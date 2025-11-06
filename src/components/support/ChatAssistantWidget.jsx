// src/components/support/ChatAssistantWidget.jsx
import { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { useI18n } from '../../i18n';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const FAQ = [
  { q: ['how claim', 'claim item', 'tuntut', 'cara tuntut'],
    a: 'Open Lost Item → click "Claim". You will receive an 8-char unlock code via email. Enter it on the box within 5 minutes.' },
  { q: ['get unlock code', 'where code', 'kod buka', 'dapat kod'],
    a: 'The unlock code is emailed to your registered email immediately after you click "Claim".' },
  { q: ['code not working', 'wrong code', 'invalid code', 'kod salah'],
    a: 'Double-check you entered all 8 characters correctly. Codes expire after 5 minutes; request a new one if needed.' },
  { q: ['report hep', 'lapor hep', 'aduan', 'salah ambil'],
    a: 'You can submit a "Report to HEP" form from Help Center. Provide your name, Student ID, and description.' },
  { q: ['verify email', 'not receive email', 'tiada emel'],
    a: 'Check your spam folder. Or go to Settings → Security → Resend Verification.' },
];

function smallTalkOrNull(s, t) {
  if (/(^|\s)(hi|hello|hey|salam|hai)\b/i.test(s)) return t('help.chat.greet', 'Hello 👋 How can I assist you today?');
  if (/(thank(s)?|terima kasih|tq)/i.test(s)) return t('help.chat.thanks', "You're welcome! 😊");
  if (/(good day|selamat pagi|selamat petang|selamat malam)/i.test(s)) return t('help.chat.goodDay', 'Have a great day! 🌟');
  return null;
}

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
  const nodeRef = useRef(null);

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
        'Hmm, I am not sure. Try "Report to HEP" in Help Center or ask something like "how claim", "code expired".'
      );

    setTimeout(() => setEntries((e) => [...e, { role: 'bot', text: answer }]), 180);
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl flex items-center justify-center text-white transition-all hover:scale-110 z-[9997]"
        aria-label="Open assistant"
        onClick={() => setOpen((v) => !v)}
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      {open && (
        <Draggable
          nodeRef={nodeRef}
          handle=".chat-drag-handle"
          cancel="input,textarea,button,.no-drag"
          defaultPosition={{ x: 0, y: 0 }}
        >
          <div
            ref={nodeRef}
            className="fixed bottom-24 right-6 w-[min(95vw,24rem)] glass-gradient rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-[9998] flex flex-col animate-slideUp"
          >
            {/* Header */}
            <div className="chat-drag-handle cursor-move flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {t('help.aiTitle', 'Ask ItemCloud')}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                aria-label={t('common.close', 'Close')}
              >
                <XMarkIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Messages */}
            <div ref={boxRef} className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {entries.map((e, i) => (
                <div key={i} className={e.role === 'me' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      e.role === 'me'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    }`}
                  >
                    {e.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('help.aiPlaceholder', 'Type a question...')}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                />
                <button
                  onClick={send}
                  className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center justify-center text-white transition-all shadow-lg"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </Draggable>
      )}
    </>
  );
}