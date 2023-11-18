# @insectos/node-red-cloudflare-ddns

Cloudflare does not offer a [DDNS](https://www.cloudflare.com/learning/dns/glossary/dynamic-dns/) client on the free plan. This node closes the gap.

Node that checks the public IP address of the current NodeRED instance using [ipify](https://www.ipify.org). When the IP address doesn't match the cached value, calls the Cloudflare API to correct the value. The cached value is retrived from context on startup. Works with Cloudflare cached ip addressen too.

## Preparation

You need to login to your [Cloudflare](https://www.cloudflare.com/) account and perform the following steps:

- Find your [ZoneeID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/). We only need the ZoneID here.
- Create a Cloudflare [API Token](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/). Limit it to your Zone. It needs DNS edit permisssions
- Create an A record (AAAA not yet) for your DDNS site. Add a comment tha begins with `[DDNS]` (Case sensitive)

## Usage

Add the Node to a page, use a button or a timer to trigger it.

Use a Catch node to see what errors are thrown from the SSH node that aren't already being caught and handled.

### Input

Anything: input values are ignored, used only to trigger the looup

### Output

`msg.payload <json>`

```json
{
  "ip": ["123.123.123.123", ...],
  "updated": false /* Not updated since the last run */
}
```

## Libraries used

- Mocha, Chai, Sinon for testing
- No Runtime dependencies beyond NodeRED

## Change log

### v0.0.1

- Initial creation
