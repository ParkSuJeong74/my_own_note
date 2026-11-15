import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import startupArt from './assets/startup-split.png';
import '@easyopen/design-tokens/theme.css';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App/>
    <div className="startup-splash" aria-hidden="true"
      onAnimationEnd={event => event.currentTarget.hidden = true}>
      <img src={startupArt} alt="" draggable={false}/>
    </div>
  </React.StrictMode>,
);
