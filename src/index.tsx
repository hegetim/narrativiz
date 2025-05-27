import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './components/App';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import '../node_modules/@fortawesome/fontawesome-svg-core/styles.css';
import { FakeStoryComponent } from './components/StorylineComponent';

faConfig.autoAddCss = false;

const root = ReactDOM.createRoot(
  document.getElementById('content') as HTMLElement
);
root.render(
  <React.StrictMode>
    {/* <App /> */}
    <FakeStoryComponent />
  </React.StrictMode>
);
