/* (C) 2023, stwissel, Apache-2.0 license */
'use strict';

const utils = require('./utils');

module.exports = function (RED) {
  /* ssh connection */
  function CloudFlareDdnsHub(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    node.spokes = {};
    if (this.credentials.token) {
      try {
        const parsed = JSON.parse(this.credentials.token);
        parsed.forEach((spoke) => {
          node.spokes[spoke.host] = spoke.token;
        });
      } catch (e) {
        console.error(e);
      }
    } else if (config.spokes) {
      config.spokes.forEach((spoke) => {
        node.spokes[spoke.host] = spoke.token;
      });
    }
    node.cfKey = this.credentials.cfKey;
    node.zoneID = this.credentials.zoneID;

    node.status({ fill: 'gray', shape: 'ring', text: 'ready' });

    node.on('input', (msg, done) => {
      utils.updateDdnsFromSpoke(node, msg, done);
    });

    node.on('close', (done) => {
      node.status({});
      done();
    });
  }

  RED.nodes.registerType('cloudflare-ddns-hub', CloudFlareDdnsHub, {
    credentials: {
      cfKey: { type: 'password' },
      zoneID: { type: 'password' },
      token: { type: 'text' }
    }
  });
};
