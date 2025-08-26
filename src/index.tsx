/* SPDX-FileCopyrightText: 2025 Tim Hegemann <hegemann@informatik.uni-wuerzburg.de>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './components/App';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import '../node_modules/@fortawesome/fontawesome-svg-core/styles.css';
import { FakeStoryComponent } from './components/StorylineComponent';
import { OneShot } from './components/OneShot';

faConfig.autoAddCss = false;

const root = ReactDOM.createRoot(
  document.getElementById('content') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
    {/* <FakeStoryComponent /> */}
    {/* <OneShot /> */}
  </React.StrictMode>
);
