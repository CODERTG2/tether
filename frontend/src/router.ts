import { View, setCurrentView, renderThemeToggle } from './state';
import { renderSetup, attachSetupListeners } from './views/setup';
import { renderDashboard, attachDashboardListeners } from './views/dashboard';
import { renderSettings, attachSettingsListeners } from './views/settings';
import { renderPortscanLoading, attachPortscanLoadingListeners } from './views/portscan';

export async function navigate(view: View) {
  setCurrentView(view);
  const app = document.getElementById('app')!;

  switch (view) {
    case 'setup':
      app.innerHTML = renderSetup();
      attachSetupListeners();
      break;
    case 'dashboard':
      app.innerHTML = await renderDashboard();
      attachDashboardListeners();
      break;
    case 'settings':
      app.innerHTML = await renderSettings();
      attachSettingsListeners();
      break;
    case 'portscan':
      app.innerHTML = renderPortscanLoading();
      attachPortscanLoadingListeners(false);
      break;
  }

  renderThemeToggle();
}
