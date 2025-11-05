import { useI18n } from '../i18n';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">{t('legal.privacy.title')}</h1>
      <p className="text-slate-600">{t('legal.lastUpdated')}</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.intro.h')}</h2>
        <p>{t('legal.privacy.intro.p1')}</p>
        <p>{t('legal.privacy.intro.p2')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.dataWeCollect.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.privacy.dataWeCollect.account')}</li>
          <li>{t('legal.privacy.dataWeCollect.items')}</li>
          <li>{t('legal.privacy.dataWeCollect.reports')}</li>
          <li>{t('legal.privacy.dataWeCollect.usage')}</li>
          <li>{t('legal.privacy.dataWeCollect.cookies')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.howWeUse.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.privacy.howWeUse.ops')}</li>
          <li>{t('legal.privacy.howWeUse.notify')}</li>
          <li>{t('legal.privacy.howWeUse.safety')}</li>
          <li>{t('legal.privacy.howWeUse.support')}</li>
          <li>{t('legal.privacy.howWeUse.legal')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.bases.h')}</h2>
        <p>{t('legal.privacy.bases.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.sharing.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.privacy.sharing.hep')}</li>
          <li>{t('legal.privacy.sharing.vendors')}</li>
          <li>{t('legal.privacy.sharing.law')}</li>
          <li>{t('legal.privacy.sharing.consent')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.retention.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.privacy.retention.photos')}</li>
          <li>{t('legal.privacy.retention.claims')}</li>
          <li>{t('legal.privacy.retention.reports')}</li>
          <li>{t('legal.privacy.retention.logs')}</li>
        </ul>
        <p className="text-sm text-slate-600">{t('legal.privacy.retention.note')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.security.h')}</h2>
        <p>{t('legal.privacy.security.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.rights.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.privacy.rights.access')}</li>
          <li>{t('legal.privacy.rights.correct')}</li>
          <li>{t('legal.privacy.rights.delete')}</li>
          <li>{t('legal.privacy.rights.export')}</li>
          <li>{t('legal.privacy.rights.consent')}</li>
        </ul>
        <p>{t('legal.contactCTA')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.children.h')}</h2>
        <p>{t('legal.privacy.children.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.privacy.changes.h')}</h2>
        <p>{t('legal.privacy.changes.p')}</p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{t('legal.contact.h')}</h2>
        <p>
          {t('legal.contact.p')}{' '}
          <a className="text-blue-600 underline" href={`mailto:${t('legal.contactEmail')}`}>
            {t('legal.contactEmail')}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
