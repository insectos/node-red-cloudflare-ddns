/* (C) 2023, stwissel, Apache-2.0 license */
'use strict';

const utils = require('./utils');

module.exports = function (RED) {
  /* ssh connection */
  function ClodFlareDdnsSpoke(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    node.host = config.host;
    node.spokeKey = this.credentials.spokeKey;

    node.status({ fill: 'gray', shape: 'ring', text: 'ready' });

    node.on('input', (msg, done) => {
      utils.updateHost(node, msg, done);
    });

    node.on('close', (done) => {
      node.status({});
      done();
    });
  }

  RED.nodes.registerType('cloudflare-ddns-spoke', ClodFlareDdnsSpoke, {
    credentials: {
      spokeKey: { type: 'password' }
    }
  });
};
