const crypto = require('crypto');
const https = require('https');
const { execSync } = require('child_process');

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAvqfiy7VBTBp2dhGDum1QC0bPq2kPNoSc5bzGuIiK58CKYX4a
QuWBM7ozJXfkuk9UlgXN33rfBYl+JgKwcyzOI2Ao3FS/41EKd0q0JA7sPw9tZAMq
TYKPIzMNeiEG0bnP1vbCckVAZXnaxkXldG8Zo2+n/XoVgv0yvW3VTS7lOE/bEvlW
OjgpqbGSpEvteykfsbL9+iYhnBKtKCPPUzJy2+9k93bFBfc5tsRnxmTRwVPW2cDv
yPf0HYmRv0n8h+NevTwfVwxgmtVb9jClSjjLffGMzgltG+F+/ji21pokFLQ0Ijmi
VjVYcZ1Kl4qlHj0YiP+c4gxjyYuGw/CaSnbwMQIDAQABAoIBABGimdnZ5DZT5E07
hYHDBrpkTGVAjIWwcorVkVQUXTTenG40Kd2yOOc9++klU+Tf3aUa2FYpmWN7uk1t
xkCBDng7Nsxakn1GS7+JC2yibLvQg3/SwyD0SKUq3b5EO8s+crkhjg7f1PsN8GyS
nozMkgSKGXHazw6UuRLIjAhdpBo3L9icBOhsN7hgXr4viYxaKCUl/Gk4BRlHuwMJ
EZOGUL9Z2rkZx3tI7SfWYLMBmhjWyoa8rzBOm6su8RGr0xdNIYgJ2nk1kCcHQ3H6
N6utj0invG0naAxNOJUnPhzGFgEeFmM9BeJZ4FKWQPCcWWdPXd6vxOB88fZ+l5u7
BZKHoSECgYEA5R4q0CI7zqveaRBB2QGmY1qZGQ58mn7dSaExnvaCVzRxdqoYlDlv
D5zZggUPRJy5Zjy9oVRHmgRBdzU3wOGdqQBbvx2WKUE+NHfc8zhpYDk1mnyg3YHh
nVzIeKtlVXa0c4FJuotkAWA4NZApsYvLikUVdnICfg+Bxum+zCYgJN0CgYEA1QZ2
9WThvouhXix6l7smJVqkmNrru0F91/dGdGmHzxAHWFgoXVllGD9wEbNirjufnmkv
/T9RgPWdD3L5yq2cam8dQBWmId87U1xNtrglRlmjJ2f3at+gPBJ0PlZF1dR448rw
XWNHeNUmbrB/scqpazY/Tgnu73add3S7FUbVKWUCgYEA4D6RappG7PVcPnpR6GHs
BwvyEgsSu2d1kA37cfkVAuLqNlkuq0w3PhGm9NGc6ut1rfG/K7pARibqKBFnGxn2
5CTcpwX/JSudBV9XWpmY0TvNEgHutD3dotXfw/MEwAvpe69LiQ/KdmpFOW96zzHi
qdcJtZ7Kf7UPsK6wNkEObuUCgYBKlpfidm9Ai5113vcR15qUq7dEOiseBuFsVA2c
RzMhQkiAG2YOwXVPVy8DU58yyHesPMJr1tbP47AZr7VczQsejUddn/bql0Irfv9L
AhEzH8Gr05BjIGf3gLKo/QY4x8uIXw9oc5Gb8m4hhbVAaGiHvJfP2FSMDik2oW28
FnAerQKBgQDhZtxGI9lc7MhXvImQyGz4KTeLQqOGmD7nlEMV0BK/4J5UJkfDMGAW
PAT40OgoU825Rq+pnwFymvjsvDnznKCxx1uCxyV/XB0gkcfVajHcormhSrEg/4Qy
s9XsXVpHxH+dNQ0Gfw2Cn16fO2wleBl4rx8Wf4f5IaUrmn+BM8t/SA==
-----END RSA PRIVATE KEY-----`;

const appId = '3916158';
const now = Math.floor(Date.now() / 1000);
const payload = { iat: now - 60, exp: now + 600, iss: appId };

function base64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
const body = base64url(Buffer.from(JSON.stringify(payload)));
const sig = base64url(crypto.sign('sha256', Buffer.from(header + '.' + body), privateKey));
const jwt = header + '.' + body + '.' + sig;

// Output JWT so we can use with gh CLI
console.log(jwt);
