import { useI18n } from '../i18n';

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ItemCloud" className="h-12 w-12 rounded-xl" />
          <div>
            <div className="text-2xl font-semibold">{t('about.title')}</div>
            <div className="text-sm text-slate-500">{t('tagline')}</div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="font-semibold">{t('about.mission')}</div>
        <div className="text-sm mt-1">{t('about.missionDesc')}</div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="font-semibold">{t('about.contact')}</div>
        <div className="text-sm mt-1"><b>Email: info.itemcloud@gmail.com</b></div>
        <div className="text-sm">Location: Kolej Matrikulasi Johor</div>
      </div>
    </div>
  );
}
