import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DesignSystem from './DesignSystem';
import '../styles.css';
import './ds.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignSystem />
  </StrictMode>,
);
