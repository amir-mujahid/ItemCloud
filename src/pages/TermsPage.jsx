import { useI18n } from '../i18n';

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-3xl font-semibold">{t('legal.terms.title')}</h1>
      <p className="text-slate-600">{t('legal.lastUpdated')}</p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.accept.h')}</h2>
        <p>{t('legal.terms.accept.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.service.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.terms.service.desc')}</li>
          <li>{t('legal.terms.service.codes')}</li>
          <li>{t('legal.terms.service.disputes')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.accounts.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.terms.accounts.info')}</li>
          <li>{t('legal.terms.accounts.security')}</li>
          <li>{t('legal.terms.accounts.eligibility')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.acceptableUse.h')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>{t('legal.terms.acceptableUse.noTamper')}</li>
          <li>{t('legal.terms.acceptableUse.noAbuse')}</li>
          <li>{t('legal.terms.acceptableUse.noFalse')}</li>
          <li>{t('legal.terms.acceptableUse.noScrape')}</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.reports.h')}</h2>
        <p>{t('legal.terms.reports.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.thirdParties.h')}</h2>
        <p>{t('legal.terms.thirdParties.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.termination.h')}</h2>
        <p>{t('legal.terms.termination.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.disclaimer.h')}</h2>
        <p>{t('legal.terms.disclaimer.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.liability.h')}</h2>
        <p>{t('legal.terms.liability.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.indemnity.h')}</h2>
        <p>{t('legal.terms.indemnity.p')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('legal.terms.governing.h')}</h2>
        <p>{t('legal.terms.governing.p')}</p>
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
