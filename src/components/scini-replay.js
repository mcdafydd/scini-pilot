/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import { LitElement, html } from 'lit-element';

import { SharedStyles } from './shared-styles.js';

class SciniReplay extends LitElement {
  render() {
    return html`
      ${SharedStyles}
      <style>
        :host {
          display: block;
        }

        /* Wide Layout */
        @media (min-width: 648px) {
        }
      </style>
    `;
  }
}

window.customElements.define('scini-replay', SciniReplay);
