import './styles/index.css';

import { GetIP } from '../wailsjs/go/main/App';
import { getTheme, setTheme, setCachedIP } from './state';
import { navigate } from './router';

async function init() {
  setTheme(getTheme());

  try {
    const existingIP = await GetIP();
    if (existingIP) {
      setCachedIP(existingIP);
      navigate('dashboard');
      return;
    }
  } catch {
    // Not configured yet
  }

  navigate('setup');
}

init();
