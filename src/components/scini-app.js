/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { LitElement, html } from '@polymer/lit-element';
import { updateMetadata } from 'pwa-helpers/metadata.js';

import '@polymer/app-layout/app-scroll-effects/effects/waterfall.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/app-layout/app-drawer/app-drawer.js';
import { setPassiveTouchGestures } from '@polymer/polymer/lib/utils/settings.js';

import { menuIcon, backIcon, accountIcon } from './scini-icons.js';
import './snack-bar.js';
import './speech-mic.js';

import { connect } from 'pwa-helpers/connect-mixin.js';
import { installRouter } from 'pwa-helpers/router.js';
import { installOfflineWatcher } from 'pwa-helpers/network.js';
import { installMediaQueryWatcher } from 'pwa-helpers/media-query.js';

import { store } from '../store.js';
import { navigate, updateLocationURL, updateOffline, updateLayout, showSnackbar, updateDrawerState, updateCameraMap } from '../actions/app.js';

import { initGrid, serializeLayout, saveLayout, loadLayout } from '../shared-grid.js';
import { initMqtt } from '../shared-mqtt.js';

import { SharedStyles } from './shared-styles.js';

class SciniApp extends connect(store)(LitElement) {
  constructor() {
    super();
    // To force all event listeners for gestures to be passive.
    // See https://www.polymer-project.org/3.0/docs/devguide/settings#setting-passive-touch-gestures
    setPassiveTouchGestures(true);

    // Setup mqtt SharedWorker
    this.mqttWorker = new SharedWorker('src/worker-mqtt.js');
    this.swCh = new BroadcastChannel('swCh');
    loadCameraMap();
    initMqtt(this.mqttWorker, this.swCh);
  }

  render() {
    const {
      appTitle,
      _page,
      _lastVisitedListPage,
      _offline,
      _wideLayout,
      _drawerOpened,
      _snackbarOpened
    } = this;

    // True to hide the menu button and show the back button.
    const hideMenuBtn = false;
    // back button href
    const backHref = '/' + _lastVisitedListPage;

    return html`
    ${SharedStyles}
    <style>
      :host {
        display: block;

        --app-drawer-width: 256px;
        --app-header-height: 128px;
        --app-footer-height: 104px;
        /* The 1px is to make the scrollbar appears all the time */
        --app-main-content-min-height: calc(100vh - var(--app-header-height) - var(--app-footer-height) + 1px);

        /* Default theme */
        --app-primary-color: #fafafa;
        --app-secondary-color: #fafafa;
        --app-dark-text-color: var(--app-secondary-color);
        --app-background-color: #020202;

        color: var(--app-dark-text-color);

        --app-drawer-background-color: var(--app-background-color);
        --app-drawer-text-color: var(--app-dark-text-color);
        --app-drawer-selected-color: var(--app-dark-text-color);
      }

      app-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        text-align: center;
        background-color: var(--app-background-color);
        z-index: 1;
      }

      .toolbar-top {
        padding: 0 8px 0 8px;
      }

      .toolbar-bottom {
        justify-content: center;
        background-color: var(--app-background-color);
      }

      [main-title] > a {
        font-size: 18px;
        font-weight: bold;
        letter-spacing: 0.1em;
        text-decoration: none;
        text-transform: uppercase;
        color: inherit;
        pointer-events: auto;
        /* required for IE 11, so this <a> can receive pointer events */
        display: inline-block;
      }

      .menu-btn,
      .back-btn {
        display: inline-block;
        width: 40px;
        height: 40px;
        padding: 8px;
        box-sizing: border-box;
        background: none;
        background-color: var(--app-primary-color);;
        border: none;
        fill: var(--app-header-text-color);
        cursor: pointer;
        text-decoration: none;
      }

      app-drawer {
        z-index: 2;
      }

      .drawer-list {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 24px;
        background: var(--app-drawer-background-color);
        position: relative;
      }

      .drawer-list > a {
        display: block;
        text-decoration: none;
        color: var(--app-drawer-text-color);
        line-height: 40px;
        padding: 0 24px;
      }

      .drawer-list > a[selected] {
        color: var(--app-drawer-selected-color);
        font-weight: bold;
      }

      main {
        display: block;
      }

      .main-content {
        padding-top: var(--app-header-height);
        min-height: var(--app-main-content-min-height);
      }

      ._page {
        display: none;
      }

      ._page[active] {
        display: block;
      }

      footer {
        height: var(--app-footer-height);
        padding: 24px;
        box-sizing: border-box;
        text-align: center;
      }

      [hidden] {
        display: none !important;
      }
    </style>

    <!-- Header -->
    <app-header condenses reveals effects="waterfall">
      <app-toolbar class="toolbar-top">
        <button class="menu-btn" aria-label="Menu" ?hidden="${hideMenuBtn}"
            @click="${() => store.dispatch(updateDrawerState(true))}">${menuIcon}</button>
        <a class="back-btn" aria-label="Go back" ?hidden="${!hideMenuBtn}" href="${backHref}">${backIcon}</a>
        <div main-title><a href="/">${appTitle}</a></div>
      </app-toolbar>
      <app-toolbar class="toolbar-bottom" sticky>
      <speech-mic slot="button" continuous interimResults @result="${(e) => this._micResult(e)}"></speech-mic>
      </app-toolbar>
    </app-header>

    <!-- Drawer content -->
    <app-drawer .opened="${_drawerOpened}"
        @opened-changed="${e => store.dispatch(updateDrawerState(e.target.opened))}">
      <nav class="drawer-list" @click="${e => store.dispatch(updateDrawerState(false))}">
        <a ?selected="${_page === 'camera'}" href="/camera">Home</a>
        <a ?selected="${_page === 'camera'}" href="/camera">Camera</a>
        <a ?selected="${_page === 'controls'}" href="/controls">Controls</a>
        <a ?selected="${_page === 'telemetry'}" href="/telemetry">Telemetry</a>
        <a ?selected="${_page === 'numbers'}" href="/numbers">Numbers</a>
        <a ?selected="${_page === 'files'}" href="/files">Files</a>
        <a ?selected="${_page === 'troubleshooting'}" href="/troubleshooting">Troubleshooting</a>
        <a ?selected="${_page === 'cameragl'}" href="/cameragl">CameraGL</a>
        <a ?selected="${_page === 'replay'}" href="/replay">Replay</a>
        <a ?selected="${_page === 'about'}" href="/about">About</a>
      </nav>
    </app-drawer>

    <!-- Main content -->
    <main role="main" class="main-content">
      <scini-home class="_page" ?active="${_page === 'home'}"></scini-home>
      <scini-camera class="_page" ?active="${_page === 'camera'}"></scini-camera>
      <scini-controls class="_page" ?active="${_page === 'controls'}"></scini-controls>
      <scini-telemetry class="_page" ?active="${_page === 'telemetry'}"></scini-telemetry>
      <scini-numbers class="_page" ?active="${_page === 'numbers'}"></scini-numbers>
      <scini-files class="_page" ?active="${_page === 'files'}"></scini-files>
      <scini-troubleshooting class="_page" ?active="${_page === 'troubleshooting'}"></scini-troubleshooting>
      <scini-cameragl class="_page" ?active="${_page === 'cameragl'}"></scini-cameragl>
      <scini-replay class="_page" ?active="${_page === 'replay'}"></scini-replay>
      <scini-about class="_page" ?active="${_page === 'about'}"></scini-about>
      <scini-404 class="_page" ?active="${_page === '404'}"></scini-404>
    </main>

    <footer>
      <p>Made with &lt;3 by the Polymer and SCINI team.</p>
    </footer>

    <snack-bar ?active="${_snackbarOpened}">
      <p>Network: ${_offline ? 'offline' : 'online'}.</p>
      <p>SCINI ROV: ${_offline ? 'offline' : 'online'}</p>
      <p>Clump: ${_offline ? 'offline' : 'online'}</p></snack-bar>
    `;
  }

  static get properties() {
    return {
      appTitle: { type: String },
      _page: { type: String },
      _lastVisitedListPage: { type: Boolean },
      _offline: { type: Boolean },
      _wideLayout: { type: Boolean },
      _drawerOpened: { type: Boolean },
      _snackbarOpened: { type: Boolean }
    }
  }

  updated(changedProps) {
    if (changedProps.has('_page')) {
      window.scrollTo(0, 0);
    }
    if (changedProps.has('_page')) {
      const pageTitle = this.appTitle + ' - ' + this._page;
      updateMetadata({
        title: pageTitle,
        description: pageTitle
        // This object also takes an image property, that points to an img src.
      });
    }
  }

  firstUpdated() {
    installRouter((location) => store.dispatch(navigate(location)));
    installOfflineWatcher((offline) => store.dispatch(updateOffline(offline)));
    installMediaQueryWatcher(`(min-width: 460px)`,
        (matches) => store.dispatch(updateLayout(matches)));
    this.removeAttribute('unresolved');
  }

  stateChanged(state) {
    this._page = state.app.page;
    this._lastVisitedListPage = state.app.lastVisitedListPage;
    this._offline = state.app.offline;
    this._wideLayout = state.app.wideLayout;
    this._drawerOpened = state.app.drawerOpened;
    this._snackbarOpened = state.app.snackbarOpened;
  }

  _micResult(e) {
    const d = e.detail;
    const value = d.completeTranscript;
    this._input.value = value;
    if (d.isFinal) {
      store.dispatch(updateLocationURL(`/controls?q=${value}`));
    }
  }
}

function loadCameraMap() {
  let obj = window.localStorage.getItem('cameraMap');
  if (obj !== null) {
    store.dispatch(updateCameraMap(JSON.parse(obj)));
  }
}

window.customElements.define('scini-app', SciniApp);
