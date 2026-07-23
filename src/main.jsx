import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import DeviceFrame from './components/DeviceFrame.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="nk-stage">
      <DeviceFrame>
        <App />
      </DeviceFrame>
    </div>
  </React.StrictMode>,
);
