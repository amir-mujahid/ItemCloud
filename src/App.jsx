// src/App.jsx
import { Suspense } from 'react';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import Shell from './layouts/Shell';
import AppRoutes from './router';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <I18nProvider>
          <Shell>
            <Suspense fallback={<div className="p-6 text-sm opacity-70">Loading…</div>}>
              <AppRoutes />
            </Suspense>
          </Shell>
        </I18nProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
