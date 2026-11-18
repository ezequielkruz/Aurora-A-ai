import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { applyAuroraTheme, loadSavedThemeId } from './utils/themes.ts';

applyAuroraTheme(loadSavedThemeId());

createRoot(document.getElementById('root')!).render(<App />);
