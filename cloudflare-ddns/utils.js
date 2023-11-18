/* (C) 2023, stwissel, Apache-2.0 license */
'use strict';

/**
 *
 * @param {string} host DNS name
 * @returns JSON
 */
const initialDNSquery = (node, ipObject, fetchFunc) =>
  new Promise((resolve, reject) => {
    // shortcut if we know already
    if (ipObject) {
      return resolve(ipObject);
    }
    const actualFetch = fetchFunc ?? global.fetch;
    const host = node.host;
    const cfDNS = new URL('https://cloudflare-dns.com/dns-query');
    cfDNS.searchParams.set('name', host);
    cfDNS.searchParams.set('type', 'A');

    const headers = new Headers();
    headers.append('accept', 'application/dns-json');

    const dnsOptions = {
      method: 'GET',
      headers: headers,
      redirect: 'follow'
    };
    connectStatus(node, cfDNS.hostname);
    actualFetch(cfDNS, dnsOptions)
      .then((result) => result.json())
      .then((json) => {
        if (json.Status !== 0) {
          return resolve({ exist: false, ip: [] });
        }
        let ips = json.Answer.map((a) => a.data);
        return resolve({ exist: true, ip: ips });
      })
      .catch((err) => reject(err));
  });

/**
 *  Gets the current IPv4 public address
 * @param {function} fetchFunc Actual function for fetching
 * @returns json with ip property
 */
const actualIpAddress = (fetchFunc) => {
  const actualFetch = fetchFunc ?? global.fetch;
  const ipofyUrl = 'https://api.ipify.org?format=json';
  return actualFetch(ipofyUrl).then((result) => result.json());
};

/**
 * Runs a Host IP Lookup with update as needed
 *
 * @param {NodeRED} node
 * @param {json} msg
 * @param {callback} done
 * @param {extends global.fetch} fetchFunc
 */
const updateDdns = async (node, msg, done, fetchFunc) => {
  const actualFetch = fetchFunc ?? global.fetch;
  const host = node.host;
  const nodeContext = node.context();
  let ipObject = nodeContext.get('DDNS');

  try {
    let newIpObject = await initialDNSquery(node, ipObject, actualFetch);
    let actualIp = await actualIpAddress(actualFetch);

    if (isupdateNeeded(newIpObject, actualIp)) {
      updateDNSEntry(node, actualIp.ip, done, actualFetch);
    } else {
      unchangedStatus(node, host);
      ipObject.updated = false;
      node.send({ payload: ipObject });
      done();
    }
  } catch (err) {
    errorStatus(node, host, err);
    done(err);
  }
};

/**
 *
 * @param {json} current
 * @param {json} actual
 * @returns true/false
 */
const isupdateNeeded = (current, actual) => {
  const ip = actual.ip;
  const candidates = current.ip;
  const present = candidates.filter((c) => c === ip);
  return present.length < 1;
};

/**
 * Checks for the
 * @param {NodeRED} node
 * @param {fetch extends global.fetch} fetchFunc
 */
const findCloudflareRecord = async (node, fetchFunc) => {
  const actualFetch = fetchFunc ?? global.fetch;
  const zoneID = node.zoneID;
  const cfKey = node.cfKey;
  const queryURL = `https://api.cloudflare.com/client/v4/zones/${zoneID}/dns_records`;
  const host = node.host;
  const headers = new Headers();
  headers.append('accept', 'application/json');
  headers.append('Authorization', `Bearer ${cfKey}`);
  const cfOptions = {
    method: 'GET',
    headers: headers,
    redirect: 'follow'
  };
  connectStatus(node, queryURL);
  const records = await actualFetch(queryURL, cfOptions).then((result) =>
    result.json()
  );
  const oneRecord = records.result.filter(
    (record) =>
      record.type === 'A' &&
      record.name === host &&
      record.comment.startsWith('[DDNS]')
  );
  if (oneRecord.length < 1) {
    errorStatus(
      node,
      host,
      'No DNS record found to update [DDNS] comment missing?'
    );
    throw new Error('No DNS record found to update [DDNS] comment missing?');
  }
  return oneRecord[0];
};

const updateDNSEntry = async (node, ip, done, fetchFunc) => {
  const actualFetch = fetchFunc ?? global.fetch;
  // Get the DNS entry and find the record id
  const zoneID = node.zoneID;
  const cfKey = node.cfKey;

  try {
    const cfRecord = await findCloudflareRecord(node, actualFetch);

    if (cfRecord.content === ip) {
      // We have a CF proxied entry
      unchangedStatus(node, node.host);
      const ipObject = { updated: false, ip: [ip] };
      node.send({ payload: ipObject });
      return done();
    }

    const queryURL = `https://api.cloudflare.com/client/v4/zones/${zoneID}/dns_records/${cfRecord.id}`;
    const body = { content: ip };
    const headers = new Headers();
    headers.append('accept', 'application/json');
    headers.append('Authorization', `Bearer ${cfKey}`);
    const patchOptions = {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(body)
    };
    connectStatus(node, queryURL);
    const cfResponse = await actualFetch(queryURL, patchOptions).then(
      (result) => result.json()
    );

    if (cfResponse?.result.content) {
      const ipObject = { ip: [cfResponse.result.content], updated: true };
      // Send the update
      updatedStatus(node, node.host);
      node.context().set('DDNS', ipObject);
      node.send({ payload: ipObject });
      done();
    } else {
      throw new Error('CF Update failed');
    }
  } catch (err) {
    errorStatus(node, node.host, err);
    console.error(err);
    done(err);
  }
};

/**
 * Shortcut to register an error
 * snd display a red dot
 *
 * @param {NodeRED node} node
 * @param {string} host
 * @param {Error} e
 */
const errorStatus = (node, host, e) => {
  node.error(`DDNS error`, { errMsg: e, host: host });
  node.status({ fill: 'red', shape: 'ring', text: `error ${e}` });
};

/**
 * Shortcut show connected green dot
 *
 * @param {NodeRED node} node
 * @param {string} host
 */
const connectStatus = (node, host) => {
  node.log(`DDNS connected ${host}`);
  node.status({
    fill: 'green',
    shape: 'dot',
    text: `connected ${host}!`
  });
};

/**
 * Shortcut show connected blue circle
 *
 * @param {NodeRED node} node
 * @param {string} host
 */
const unchangedStatus = (node, host) => {
  node.log(`DDNS unchanged ${host}`);
  node.status({
    fill: 'blue',
    shape: 'circle',
    text: `unchanged ${host}!`
  });
};

/**
 * Shortcut show connected blue dot
 *
 * @param {NodeRED node} node
 * @param {string} host
 */
const updatedStatus = (node, host) => {
  node.log(`DDNS updated ${host}`);
  node.status({
    fill: 'blue',
    shape: 'dot',
    text: `updated ${host}!`
  });
};

module.exports = {
  updateDdns
};
