/* (C) 2023, stwissel, Apache-2.0 license */
'use strict';

const chai = require('chai');
const rewire = require('rewire');
const sinon = require('sinon');
const utils = rewire('../cloudflare-ddns/utils');
const { MockNode } = require('./mockobjects');
const expect = chai.expect;

describe('Testing log and status', () => {
  let node;

  beforeEach(() => {
    node = new MockNode();
  });
  it('should log the status message', () => {
    const functionToTest = utils.__get__('connectStatus');
    functionToTest(node, 'horst', 'unittest');
    expect(node.calledEndpoints.log).to.equal('DDNS connected horst');
  });

  it('should update the status', () => {
    const functionToTest = utils.__get__('connectStatus');
    functionToTest(node, 'horst', 'unittest');
    let status = node.calledEndpoints.status;
    expect(status.text).to.equal('connected horst!');
    expect(status.fill).to.equal('green');
    expect(status.shape).to.equal('dot');
  });

  it('should update the connect status', () => {
    const functionToTest = utils.__get__('unchangedStatus');
    functionToTest(node, 'horst', 'unittest');
    let status = node.calledEndpoints.status;
    expect(status.text).to.equal('unchanged horst!');
    expect(status.fill).to.equal('blue');
    expect(status.shape).to.equal('circle');
    expect(node.calledEndpoints.log).to.equal('DDNS unchanged horst');
  });
});

describe('Testing callouts to CloudFlare', () => {
  let stub;
  let node;
  beforeEach(() => {
    stub = sinon.stub(global, 'fetch');
    node = new MockNode();
    node.host = 'demo.local';
  });

  afterEach(() => {
    stub.restore();
  });
  it('should return object with ip array', async () => {
    const fetchReturn = {
      Status: 0,
      Answer: [
        {
          data: '123.123.123.123'
        }
      ]
    };
    stub.returns(Promise.resolve(new Response(JSON.stringify(fetchReturn))));
    const functionToTest = utils.__get__('initialDNSquery');
    let result = await functionToTest(node, undefined, stub);
    expect(result).to.have.property('ip');
    let ips = result.ip;
    expect(ips.length).to.equal(1);
    expect(ips[0]).to.equal('123.123.123.123');
  });

  it('should return the exisiting value', async () => {
    let exisiting = { exists: true, ip: ['123.123.123.123'] };
    const functionToTest = utils.__get__('initialDNSquery');
    let result = await functionToTest(node, exisiting, stub);
    expect(result).to.equal(exisiting);
  });

  it('should call to ipify', async () => {
    stub.returns(
      Promise.resolve(new Response(JSON.stringify({ ip: '123.123.123.123' })))
    );
    const functionToTest = utils.__get__('actualIpAddress');
    let result = await functionToTest(stub);
    expect(result).to.have.property('ip');
  });
});
