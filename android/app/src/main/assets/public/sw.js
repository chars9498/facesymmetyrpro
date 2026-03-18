/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-243ec091'], (function (workbox) { 'use strict';

  workbox.setCacheNameDetails({
    prefix: "facesymmetrypro-v1.0.0"
  });
  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "mask-icon.svg",
    "revision": "26a5fb45be9366aabbd887bdcde839d8"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f31892c88455a6c53d50a04569cb8d59"
  }, {
    "url": "index.html",
    "revision": "4198361ac8b7520f807f91317c0d1f4a"
  }, {
    "url": "icon-512.png",
    "revision": "75c718cb9a2baf0bc3f5fa838eb539e4"
  }, {
    "url": "icon-192.png",
    "revision": "de1232cfe23f9ae7c6e1b1c3f07d2789"
  }, {
    "url": "favicon.ico",
    "revision": "a58c76ad9472b7ffb0800454e0cf0ffa"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5acd169258113f5f4b28064239ef0786"
  }, {
    "url": "assets/workbox-window.prod.es5-BIl4cyR9.js",
    "revision": null
  }, {
    "url": "assets/index-s_drtOnd.css",
    "revision": null
  }, {
    "url": "assets/index-CXJJW4Rr.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "5acd169258113f5f4b28064239ef0786"
  }, {
    "url": "favicon.ico",
    "revision": "a58c76ad9472b7ffb0800454e0cf0ffa"
  }, {
    "url": "icon-192.png",
    "revision": "de1232cfe23f9ae7c6e1b1c3f07d2789"
  }, {
    "url": "icon-512.png",
    "revision": "75c718cb9a2baf0bc3f5fa838eb539e4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f31892c88455a6c53d50a04569cb8d59"
  }, {
    "url": "mask-icon.svg",
    "revision": "26a5fb45be9366aabbd887bdcde839d8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
