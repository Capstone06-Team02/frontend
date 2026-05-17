import { AccessibilityPage } from './pages/AccessibilityPage';
import { CartPage } from './pages/CartPage';
import { OptionsPage } from './pages/OptionsPage';
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

  if (path === '/accessibility') {
    return <AccessibilityPage speak={speak} />;
  }

  return <VoiceOrderPage />;
};

export default App;
