const dns = require('dns').promises;
const net = require('net');
const { URL } = require('url');

// Blocks private, loopback, link-local and reserved IP ranges so an
// attacker-supplied push subscription endpoint cannot be used to probe
// the internal home network (SSRF).

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  return (
    parts[0] === 10 ||                                             // 10.0.0.0/8
    parts[0] === 127 ||                                            // 127.0.0.0/8
    parts[0] === 0 ||                                              // 0.0.0.0/8
    (parts[0] === 169 && parts[1] === 254) ||                      // 169.254.0.0/16 link-local
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||      // 172.16.0.0/12
    (parts[0] === 192 && parts[1] === 168) ||                      // 192.168.0.0/16
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||     // 100.64.0.0/10 CGNAT
    parts[0] >= 224                                               // multicast + reserved
  );
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80')) return true;                      // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
  if (lower.startsWith('::ffff:')) {                              // IPv4-mapped
    return isPrivateIPv4(lower.slice(7));
  }
  return false;
}

function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unparseable -> reject
}

// Returns true only for endpoints that resolve exclusively to public IPs.
async function isSafeEndpoint(endpoint) {
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

  const host = parsed.hostname;
  if (net.isIP(host)) return !isPrivateAddress(host);

  try {
    const addresses = await dns.lookup(host, { all: true });
    if (!addresses || addresses.length === 0) return false;
    return addresses.every((addr) => !isPrivateAddress(addr.address));
  } catch {
    return false;
  }
}

module.exports = { isSafeEndpoint, isPrivateAddress };
