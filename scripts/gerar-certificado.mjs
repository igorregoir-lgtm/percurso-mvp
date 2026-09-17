// Percurso — certificado local para HTTPS.
//
// POR QUE ISTO EXISTE: `getUserMedia` — a captura de áudio — só funciona em
// CONTEXTO SEGURO. `localhost` conta como seguro; o IP da LAN, que é como o
// celular da educadora alcança o servidor do Instituto, NÃO conta. Sem HTTPS,
// a porta A' (narrar), a C (importar) e a B (gravar) simplesmente não existem
// no aparelho dela. Isto é pre'-requisito da F1, nao refinamento.
//
// Usa o `openssl` do sistema — mesmo padrao do llama.cpp em ai/scripts/: nada
// entra por npm (decisao tecnica n. 1), o binario e' do sistema operacional.
//
// Uso:  node scripts/gerar-certificado.mjs
//       PERCURSO_HTTPS=1 node server.js
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces, hostname } from 'node:os';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'certs');
const CHAVE = join(DIR, 'percurso.key');
const CERT = join(DIR, 'percurso.crt');

function ips() {
  const achados = new Set(['127.0.0.1']);
  for (const lista of Object.values(networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) achados.add(i.address);
    }
  }
  return [...achados];
}

const enderecos = ips();
// O SAN precisa listar TODOS os nomes e IPs pelos quais o aparelho vai chegar.
// Faltar o IP da LAN e' o erro classico: o certificado existe, o navegador
// recusa, e a conclusao errada e' "HTTPS nao funciona".
// `hostname()` no macOS ja' costuma vir com `.local`; concatenar de novo gera
// `maquina.local.local`, que nao casa com nada.
const host = hostname();
const nomes = new Set(['localhost', host, host.endsWith('.local') ? host : `${host}.local`]);
const san = [
  ...[...nomes].map((n) => `DNS:${n}`),
  ...enderecos.map((ip) => `IP:${ip}`),
].join(',');

mkdirSync(DIR, { recursive: true });
const conf = join(DIR, 'openssl.cnf');
writeFileSync(conf, `[req]
distinguished_name = dn
x509_extensions = v3
prompt = no
[dn]
CN = Percurso (Instituto Ebenezer)
O = Instituto Social Ebenezer
[v3]
subjectAltName = ${san}
basicConstraints = critical,CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
`);

try {
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256',
    '-days', '825',            // teto que navegadores modernos aceitam
    '-nodes',                  // sem senha: o servidor sobe sozinho
    '-keyout', CHAVE, '-out', CERT,
    '-config', conf,
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
} catch (e) {
  console.error('\n  Falhou ao gerar o certificado.');
  console.error('  O `openssl` está instalado? Teste com: openssl version');
  console.error('  Detalhe:', String(e.stderr || e.message).trim().slice(0, 300), '\n');
  process.exit(1);
} finally {
  rmSync(conf, { force: true });
}

if (!existsSync(CHAVE) || !existsSync(CERT)) {
  console.error('\n  O openssl terminou sem erro mas não escreveu os arquivos. Abortando.\n');
  process.exit(1);
}

console.log(`
  Certificado gerado em certs/ (não versionado).

  Vale para:  ${enderecos.map((ip) => `https://${ip}:3000`).join('\n              ')}
              https://localhost:3000

  Suba assim:  PERCURSO_HTTPS=1 node server.js

  ATENÇÃO — o certificado é autoassinado. Na primeira visita, o celular vai
  avisar que a conexão "não é privada". É esperado: quem assinou foi esta
  máquina, não uma autoridade. Aceitar o aviso uma vez basta, e é o que
  destrava a captura de áudio (getUserMedia exige contexto seguro).
`);
