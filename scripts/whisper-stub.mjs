#!/usr/bin/env node
// Percurso — stub do `whisper-cli` para testes SEM modelo de audio.
//
// Mesmo padrao do scripts/ai-stub.mjs: imita a interface, nao o comportamento.
// O src/transcricao.js chama `whisper-cli -m MODELO -f ARQUIVO -l pt -nt -np -t N`
// e le' o stdout. Este stub le' o WAV, confere que ele EXISTE e devolve um texto
// canonico — o que permite exercitar o ciclo de vida do arquivo (a garantia que
// mais importa) sem baixar 465 MB de ggml.
//
// O que ele devolve depende do tamanho do arquivo, para os testes poderem
// distinguir dois pedacos:
//   arquivo com menos de 8 kB  -> "__stub_curto__"
//   qualquer outro             -> texto canonico de encontro
//
// Uso: PERCURSO_AUDIO=1 PERCURSO_WHISPER="$PWD/scripts/whisper-stub.mjs" \
//      PERCURSO_AUDIO_MODELO=package.json node server.js
import { statSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const arquivo = argv[argv.indexOf('-f') + 1];

if (!arquivo || !existsSync(arquivo)) {
  process.stderr.write('stub: arquivo de áudio não encontrado\n');
  process.exit(1);
}
if (process.env.PERCURSO_WHISPER_STUB_FALHA === '1') {
  process.stderr.write('stub: falha pedida pelo teste\n');
  process.exit(2);
}

const bytes = statSync(arquivo).size;
process.stdout.write(bytes < 8192
  ? '__stub_curto__\n'
  : 'hoje a gente fez uma roda de conversa sobre saúde e a turma participou bastante três pediram ajuda sem ninguém mandar\n');
