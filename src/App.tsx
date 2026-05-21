import { AccessibilityPage } from './pages/AccessibilityPage';
import { CartPage } from './pages/CartPage';
import { CompletePage } from './pages/CompletePage';
import { ConfirmPage } from './pages/ConfirmPage';
import { HelpPage } from './pages/HelpPage';
import { OptionsPage } from './pages/OptionsPage';
import { VoiceSettingsPage } from './pages/VoiceSettingsPage';
import { VoiceOrderPage } from './pages/VoiceOrderPage';
import { useVoice } from './hooks/useVoice';
import './index.css';

const App = () => {
  const { speak } = useVoice();
  const path = window.location.pathname;

  if (path === '/options') {
    return <OptionsPage speak={speak} />;
  }

  if (path === '/cart') {
    return <CartPage speak={speak} />;
  }

  if (path === '/confirm') {
    return <ConfirmPage speak={speak} />;
  }

  if (path === '/complete') {
    return <CompletePage speak={speak} />;
  }

  if (path === '/accessibility') {
    return <AccessibilityPage speak={speak} />;
  }

  if (path === '/help') {
    return <HelpPage speak={speak} />;
  }

  if (path === '/voice') {
    return <VoiceSettingsPage speak={speak} />;
  }

  return <VoiceOrderPage />;
};

export default App;
