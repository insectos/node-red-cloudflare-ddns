/* (C) 2023, stwissel, Apache-2.0 license */
'use strict';

const utils = require('./utils');

module.exports = function (RED) {
  /* ssh connection */
  function CloudFlareDdnsHub(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    node.spokes = JSON.parse(config.spokes);
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
      zoneID: { type: 'password' }
    }
  });
};
