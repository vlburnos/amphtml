/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS-IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {adopt} from '../../../../src/runtime';
import {createIframePromise} from '../../../../testing/iframe';
import * as sinon from 'sinon';
import '../amp-social-share';

adopt(window);

const STRINGS = {
  'text': 'Hello world',
  'url': 'https://example.com/',
  'attribution': 'AMPhtml',
  'text-too-long': 'Hello world, Hello world, Hello world, Hello world, Hello' +
    'world, Hello world, Hello world, Hello world, Hello world, Hello world, ' +
    'Hello world',
};

describe('amp-social-share', () => {

  let sandbox;

  function getShare(type, opt_endpoint, opt_params) {
    return getCustomShare(iframe => {
      const share = iframe.doc.createElement('amp-social-share');
      share.addEventListener = sandbox.spy();
      iframe.win.open = sandbox.spy();
      if (opt_endpoint) {
        share.setAttribute('data-share-endpoint', opt_endpoint);
      }

      for (const key in opt_params) {
        share.setAttribute('data-param-' + key, opt_params[key]);
      }

      share.setAttribute('type', type);
      share.setAttribute('width', 60);
      share.setAttribute('height', 44);
      return share;
    });
  }

  function getCustomShare(modifier) {
    return createIframePromise().then(iframe => {
      const canonical = iframe.doc.createElement('link');

      iframe.doc.title = 'doc title';
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', 'https://canonicalexample.com/');
      iframe.addElement(canonical);

      return iframe.addElement(modifier(iframe));
    });
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('errors if share endpoint is missing', () => {
    return createIframePromise().then(iframe => {
      const share = iframe.doc.createElement('amp-social-share');
      share.setAttribute('type', 'unknown-provider');
      expect(() => {
        share.build(true);
      }).to.throw('data-share-endpoint attribute is required');
    });
  });

  it('errors if type is missing', () => {
    return createIframePromise().then(iframe => {
      const share = iframe.doc.createElement('amp-social-share');
      expect(() => {
        share.build(true);
      }).to.throw('type attribute is required');
    });
  });

  it('renders unconfigured providers if share endpoint provided', () => {
    return getCustomShare(iframe => {
      const share = iframe.doc.createElement('amp-social-share');

      share.setAttribute('type', 'unknown-provider');
      share.setAttribute('data-share-endpoint',
          'https://exampleprovider.com/share/');
      share.setAttribute('data-param-text', 'check out: CANONICAL_URL');
      return share;
    }).then(el => {
      expect(el.implementation_.params_.text).to.be.equal(
          'check out: CANONICAL_URL');
      expect(el.implementation_.href_).to.not.contain(
          encodeURIComponent('CANONICAL_URL'));
      expect(el.implementation_.href_).to.contain(
          encodeURIComponent('https://canonicalexample.com/'));
      expect(el.implementation_.shareEndpoint_).to.be.equal(
          'https://exampleprovider.com/share/');
    });
  });

  it('renders twitter', () => {
    const params = {
      'url': STRINGS['url'],
      'via': STRINGS['attribution'],
    };
    return getShare('twitter', /* endpoint */ undefined, params).then(el => {
      expect(el.implementation_.params_.text).to.be.equal('TITLE');
      expect(el.implementation_.params_.url).to.be.equal('https://example.com/');
      expect(el.implementation_.params_.via).to.be.equal('AMPhtml');
      expect(el.implementation_.shareEndpoint_).to.be.equal(
          'https://twitter.com/intent/tweet');

      expect(el.implementation_.href_).to.not.contain('TITLE');
      expect(el.addEventListener.called).to.be.true;
      expect(el.addEventListener.calledWith('click')).to.be.true;
    });
  });

  it('adds a default value for url', () => {
    return getCustomShare(iframe => {
      const share = iframe.doc.createElement('amp-social-share');

      share.setAttribute('type', 'twitter');
      share.setAttribute('width', 60);
      share.setAttribute('height', 44);

      return share;
    }).then(el => {
      expect(el.implementation_.params_.url).to.be.equal('CANONICAL_URL');
      expect(el.implementation_.href_).to.not.contain(
          encodeURIComponent('CANONICAL_URL'));
      expect(el.implementation_.href_).to.contain(
          encodeURIComponent('https://canonicalexample.com/'));
      expect(el.implementation_.shareEndpoint_).to.be.equal(
          'https://twitter.com/intent/tweet');
    });
  });

  it('opens share window in _blank', () => {
    return getShare('twitter').then(el => {
      el.implementation_.handleClick_();
      expect(el.implementation_.getWin().open.called).to.be.true;
      expect(el.implementation_.getWin().open.calledWith(
        'https://twitter.com/intent/tweet?text=doc%20title&' +
          'url=https%3A%2F%2Fcanonicalexample.com%2F',
          '_blank', 'resizable,scrollbars,width=640,height=480'
      )).to.be.true;
    });
  });
});
