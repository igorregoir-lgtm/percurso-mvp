#!/usr/bin/env node
// Percurso — fecha a janela de PRIMEIRO ACESSO antes de expor a URL.
//
// POR QUE ISTO EXISTE. A autenticacao (decisao 39) nao semeia senha: `NULL`
// significa "crie a sua ao entrar". Na rede local isso e' o custo aceito. Numa
// URL PUBLICA, nao: quem achasse o endereco antes da pessoa reivindicaria a
// conta dela criando a senha primeiro. A propria decisao 39 nomeia a mitigacao
// — "a coordenacao define todas as senhas antes de entregar o endereco" —, e
// aqui ela deixa de ser conselho e vira passo do script.
//
// NAO E' SEMENTE. A senha nao mora no seed nem em arquivo nenhum: ela e' dada
// na linha de comando e IMPRESSA uma vez. Senha em seed e' senha publicada, e e'
// exatamente assim que uma "senha de demonstracao" chega em producao.
//
// Uso:  node scripts/senhas-demo.mjs --senha "uma frase que voce escolhe"
import { all, get, run, closeDb } from '../src/db.js';
import { definirSenha, gerarHash, SENHA_MINIMA } from '../src/auth.js';
import { agora } from '../src/domain.js';

const argv = process.argv.slice(2);
const i = argv.indexOf('--senha');
const senha = i >= 0 ? argv[i + 1] : null;

if (!senha) {
  console.error('\n  Uso: node scripts/senhas-demo.mjs --senha "uma frase que você escolhe"\n');
  console.error('  Define ESSA senha para quem ainda está em primeiro acesso, e imprime quem recebeu.');
  console.error('  Serve para fechar a janela de primeiro acesso ANTES de expor uma URL pública');
  console.error('  (decisão 39). Só faz sentido com os dados sintéticos.\n');
  process.exit(2);
}
// --curta: aceita senha abaixo do minimo do produto. EXISTE SO' AQUI, e o
// desvio e' escrito na mao neste arquivo justamente para NAO virar um parametro
// de `definirSenha` — um "permitirCurta" no modulo de autenticacao seria a porta
// por onde a excecao de demonstracao entra no produto. `validarSenha` continua
// intacta: quem trocar a senha pelo app segue obrigado aos 8 caracteres.
const CURTA = argv.includes('--curta');
if (senha.length < SENHA_MINIMA && !CURTA) {
  console.error(`\n  A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`);
  console.error(`  Para uma demonstração com senha mais curta, acrescente --curta —`);
  console.error(`  e saiba que numa URL pública ela é adivinhada de primeira.\n`);
  process.exit(2);
}

const TODOS = argv.includes('--todos');
const emPrimeiroAcesso = all(
  `SELECT id, nome, papel FROM educador
    WHERE arquivado_em IS NULL ${TODOS ? '' : 'AND senha_hash IS NULL'} ORDER BY id`);

if (!emPrimeiroAcesso.length) {
  console.log('\n  Ninguém está em primeiro acesso — nada a fazer.');
  console.log('  (Para trocar a senha de TODOS, mesmo de quem já tem: --todos.)');
  console.log('  (Para devolver alguém ao primeiro acesso: Pessoas → Redefinir a senha.)\n');
} else {
  for (const e of emPrimeiroAcesso) {
    if (CURTA) {
      // Grava o hash direto, sem passar por `definirSenha` — e' o que confina o
      // desvio a este script.
      run(`UPDATE educador SET senha_hash = ?, senha_definida_em = ? WHERE id = ?`,
          await gerarHash(senha), agora(), e.id);
    } else {
      await definirSenha(e.id, senha);
    }
  }
  console.log(`\n  Senha definida para ${emPrimeiroAcesso.length} perfil(is)${TODOS ? '' : ' que estavam em primeiro acesso'}:\n`);
  for (const e of emPrimeiroAcesso) console.log(`    ${e.nome.padEnd(20)} ${e.papel}`);
  console.log('\n  A janela de primeiro acesso está FECHADA: quem achar a URL não reivindica conta.');
  console.log('  Cada pessoa troca a dela no cabeçalho, em "senha".\n');
}

const restantes = get(`SELECT COUNT(*) n FROM educador WHERE senha_hash IS NULL AND arquivado_em IS NULL`).n;
if (restantes) console.log(`  ATENÇÃO: ${restantes} perfil(is) ainda em primeiro acesso.\n`);
closeDb();
