# Jornada de usuário — Instituto Ebenézer

Artefato do **Grupo 06** para o board de Jornada de Usuário da turma. Levantado a partir da
**visita de campo de 29/08/2026** (4 gravações, 97 min) cruzada com o que este repositório afirma.

## As duas versões

| Versão | Onde | Para quê |
|---|---|---|
| **FigJam nativo** | [board `QSzxKH22Hnevnhw7HluW6m`](https://www.figma.com/board/QSzxKH22Hnevnhw7HluW6m) | tabela de 7×6, 6 sticky notes e 14 textos — **editável e comentável** pelo grupo |
| **Imagem** | [`Jornada-Usuario-Ebenezer-Grupo06.png`](Jornada-Usuario-Ebenezer-Grupo06.png) | 6800×3970, para arrastar direto na página do grupo, como o Grupo 05 fez |

> **Por que duas.** O board da turma (`fL1rxchBDlNkQZO7AEjwrf`) está **somente leitura** para a
> conta `igor.rego@mba.inteli.edu.br` — testado: a mesma ferramenta escreve nos arquivos do time
> `Inteli.MBA.2026.1` e falha nele com `read-only mode`. Enquanto o acesso não abrir, a imagem é o
> caminho que não depende de permissão. O Grupo 05 também colou a jornada deles como imagem.

## O que esta jornada tem que a do Grupo 05 não tem

A deles é **estado futuro**. Esta é a **jornada atual**, com o "onde o produto entra" marcado
dentro de cada fase — inclusive as duas linhas onde ele **não** entra:

- **a chamada**, que recebeu recusa imediata na visita, justificada por legislação;
- **o canal profissional-a-profissional**, que é o destino que ela chama de mais rico e que não
  existe em nenhuma das rotas do produto.

## A persona contraria o repositório

É **a psicóloga** — e `JORNADAS.md` afirma que *"a psicóloga não é usuária: o tempo dela é clínico,
e nenhum fluxo do produto depende dela"*. A visita derrubou isso duas vezes: é ela quem escreve o
relatório e quem nomeia o registro como a dor central, e na demo ao vivo **foi preciso improvisar
um perfil de psicóloga** porque o app assumia professora. As outras 6 premissas que o campo não
sustentou estão em [`CAMPO-versus-REPOSITORIO.md`](CAMPO-versus-REPOSITORIO.md).

## Método

Quatro transcrições lidas na íntegra → **65 achados**, cada um obrigado a ter citação literal
(sem frase citável, não virou achado). As **6 falas que ancoram as fases foram conferidas uma a
uma** contra os `.txt` e `.srt` originais, por verificação independente: **6 literais, 0
reprovadas**. Numa delas apareceu que o Consolidado da visita cita *"o maior desafio aqui é
registrar o que você fez"* enquanto a transcrição traz *"...o que você fez, **né?**"* — usamos a
forma literal.

Nenhum nome de criança e nenhum caso individual identificável foi reproduzido. A persona é nomeada
pelo papel — a mesma regra que o conselho profissional impõe aos relatórios que ela escreve.

## Arquivos

| Arquivo | O que é |
|---|---|
| `jornada.json` | o conteúdo verificado — fonte de verdade das duas versões |
| `jornada.html` + `gerar-jornada.py` | geram o PNG: `python3 gerar-jornada.py` e um Chrome headless |
| `figjam-dados.js` | o mesmo conteúdo no formato usado para montar o FigJam nativo |
| `CAMPO-versus-REPOSITORIO.md` | as 7 premissas do repositório que o campo não sustentou |

Fonte primária: `1 - Arquitetura/Material da Visita no Ebenezer/` — o consolidado, as quatro
transcrições e a planilha socioemocional. **As transcrições brutas contêm nomes e casos
delicados; nada derivado delas circula sem anonimização.**
