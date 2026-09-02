# Jornada de usuário — Instituto Ebenézer

Artefato do **Grupo 06** para o board de Jornada de Usuário da turma. Levantada na **visita de
campo de 29/08/2026** (4 gravações, 97 min) e cruzada com o que este repositório afirma.

## Versão 2 da jornada (02/09/2026) — "nunca é tarde para registrar"

A primeira versão descrevia bem a dor e errava a saída. Ela terminava a fase 04 dizendo *"se o
registro não nasceu durante ou logo depois da atividade, aqui ele não nasce"* — ou seja, exigia
que a usuária registrasse na única janela em que o campo mostra que ela **não tem mãos livres**,
e logo depois responde *"Não dá, não dá"*.

Esta versão corrige isso com uma distinção que atravessa o artefato inteiro:

> **Capturar não é registrar.** Capturar é apertar um botão — ou já ter um áudio no celular.
> Registrar é virar relatório, contagem e indicador, e isso é trabalho do **sistema**, a qualquer
> momento. Quem é metódico é o sistema, não a usuária. Quem estrutura o dado é o sistema, não ela.

O que mudou, concretamente:

| Mudança | Onde aparece |
|---|---|
| **Quatro portas de entrada** para o mesmo registro: falar 40 s · deixar o celular gravando o encontro · trazer um áudio que ela já tem (de hoje ou de três semanas atrás) · escrever | faixa escura `principio` no topo da grade |
| **Nova linha na tabela: "se ela não registrar nada"** — a rede de segurança de cada fase, em azul | linha 5 da tabela, `rede` em `figjam-dados.js` |
| **O encontro nunca fecha.** Registro atrasado entra com a data do encontro, não com a data de hoje | regra 3 do princípio · fases 03, 04 e 06 |
| **O sistema não cobra.** Sem notificação de atraso, sem pendência vermelha | regra 4 · momento da verdade 03 |
| **Linguagem reescrita inteira**: frases curtas, sem jargão, cada célula legível sozinha | todo o `jornada.json` |
| **Fases renomeadas pelo momento do dia** (Antes · Durante · Logo depois · À noite · Na semana · Depois) | `fases[].nome` |
| **Momentos da verdade: 6 → 8**, com dois novos (capturar × registrar; o sistema nunca cobra) | bloco Insights |
| **Contradição 8**: exigir registro na janela do encontro | `CAMPO-versus-REPOSITORIO.md` |

**O que isto custa, dito com todas as letras.** Duas das quatro portas **ainda não existem no
MVP** e estão marcadas `a construir` no artefato. Gravar o encontro inteiro e importar um arquivo
de áudio dependem de **transcrição local de arquivo** — o `SpeechRecognition` do navegador, que é
o que `public/app.js` usa hoje, só transcreve microfone ao vivo, e o manifest de `ai/` não tem
modelo de áudio. E ambas esbarram na palavra que o campo usou para gravar criança: **"perigoso"**.
Por isso a faixa do princípio traz uma **condição inegociável** — o áudio não sai do aparelho, é
apagado assim que vira texto, e nome falado vira código antes de qualquer gravação, tudo dito na
própria tela no instante do toque. Sem essas três frases visíveis, as portas B e C não podem
existir.

## As duas versões do artefato

| Versão | Onde | Para quê |
|---|---|---|
| **Imagem** | [`Jornada-Usuario-Ebenezer-Grupo06.png`](Jornada-Usuario-Ebenezer-Grupo06.png) | 6800×4964, para arrastar direto na página do grupo, como o Grupo 05 fez |
| **FigJam nativo** | [board `QSzxKH22Hnevnhw7HluW6m`](https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m) | tabela de **7 linhas × 6 fases**, sticky notes e textos — **editável e comentável** pelo grupo |

> **Por que duas.** O board da turma (`fL1rxchBDlNkQZO7AEjwrf`) está **somente leitura** para a
> conta `igor.rego@mba.inteli.edu.br` — testado: a mesma ferramenta escreve nos arquivos do time
> `Inteli.MBA.2026.1` e falha nele com `read-only mode`. Enquanto o acesso não abrir, a imagem é o
> caminho que não depende de permissão.

## O que esta jornada tem que a do Grupo 05 não tem

A deles é **estado futuro**. Esta é a **jornada atual**, com o "onde o produto entra" marcado
dentro de cada fase — inclusive as duas linhas onde ele **não** entra:

- **a chamada**, que recebeu recusa imediata na visita, justificada por legislação;
- **o canal profissional-a-profissional**, que é o destino que ela chama de mais rico e que não
  existe em nenhuma das rotas do produto.

E, desde a v2, a linha que nenhuma jornada de estado futuro costuma ter: **o que o sistema faz
quando a usuária não faz nada**.

## A persona contraria o repositório

É **a psicóloga** — e `JORNADAS.md` afirmava que *"a psicóloga não é usuária: o tempo dela é
clínico, e nenhum fluxo do produto depende dela"*. A visita derrubou isso duas vezes: é ela quem
escreve o relatório e quem nomeia o registro como a dor central, e na demo ao vivo **foi preciso
improvisar um perfil de psicóloga** porque o app assumia professora. As outras 7 premissas que o
campo não sustentou estão em [`CAMPO-versus-REPOSITORIO.md`](CAMPO-versus-REPOSITORIO.md).

## Método

Quatro transcrições lidas na íntegra → **65 achados**, cada um obrigado a ter citação literal
(sem frase citável, não virou achado). As **6 falas que ancoram as fases foram conferidas uma a
uma** contra os `.txt` e `.srt` originais, por verificação independente: **6 literais, 0
reprovadas**. Numa delas apareceu que o Consolidado da visita cita *"o maior desafio aqui é
registrar o que você fez"* enquanto a transcrição traz *"...o que você fez, **né?**"* — usamos a
forma literal. **A v2 não mexeu em nenhuma citação**: reescreveu a narrativa em volta delas.

Nenhum nome de criança e nenhum caso individual identificável foi reproduzido. A persona é nomeada
pelo papel — a mesma regra que o conselho profissional impõe aos relatórios que ela escreve.

## Arquivos

| Arquivo | O que é |
|---|---|
| `jornada.json` | o conteúdo verificado — **fonte de verdade das duas versões** |
| `gerar-jornada.py` | gera `jornada.html` a partir do JSON |
| `gerar-figjam.py` | gera `figjam-dados.js` a partir do mesmo JSON |
| `figjam-dados.js` | o conteúdo no formato usado para montar/atualizar o FigJam nativo |
| `CAMPO-versus-REPOSITORIO.md` | as 8 premissas do repositório que o campo não sustentou |

### Como regerar a imagem

```bash
python3 gerar-jornada.py && python3 gerar-figjam.py
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=2 --window-size=3400,2482 \
  --virtual-time-budget=12000 --screenshot="Jornada-Usuario-Ebenezer-Grupo06.png" \
  "file://$PWD/jornada.html"
```

A altura do `--window-size` é a `document.body.scrollHeight` da página em 3400 px de largura. Se o
conteúdo crescer, meça de novo antes de rodar — senão o PNG sai cortado.

Fonte primária: `1 - Arquitetura/Material da Visita no Ebenezer/` — o consolidado, as quatro
transcrições e a planilha socioemocional. **As transcrições brutas contêm nomes e casos
delicados; nada derivado delas circula sem anonimização.**
