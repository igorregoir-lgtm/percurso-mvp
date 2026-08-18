// Recria os dados sinteticos do zero.
//
// Funciona COM O SERVIDOR NO AR: em vez de apagar o arquivo do banco (o que
// deixaria o servidor preso ao arquivo antigo, ja removido do disco), esta
// rotina limpa as tabelas e semeia de novo pela mesma base. Basta recarregar
// a pagina no navegador depois.
//
// Use --limpar para tambem apagar o arquivo (nesse caso, pare o servidor antes).
import { rmSync } from 'node:fs';
import { DB_PATH, getDb, closeDb } from '../src/db.js';
import { semear } from '../src/seed.js';

if (process.argv.includes('--limpar')) {
  for (const suf of ['', '-wal', '-shm']) { try { rmSync(DB_PATH + suf); } catch {} }
  console.log('Arquivo do banco removido.');
}

getDb();
console.table(semear());
console.log(`Dados sinteticos recriados em: ${DB_PATH}`);
console.log('Se o servidor estiver no ar, basta recarregar a pagina.');
closeDb();
