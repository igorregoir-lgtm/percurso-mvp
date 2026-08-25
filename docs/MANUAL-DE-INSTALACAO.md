# Manual de instalação — colocar o Percurso para rodar em qualquer computador

> Escrito para quem vai operar sem equipe de tecnologia. O desenho inteiro do
> Percurso responde a isso: **o núcleo precisa de UMA coisa instalada (Node.js),
> não tem mensalidade, não tem conta em plataforma, não tem build e não quebra
> por atualização de terceiro.** A camada de IA é opcional e vem depois.
>
> Tempo estimado: núcleo em ~10 minutos; camada de IA em ~30 (por causa do
> download do modelo).

---

## Parte 1 — O núcleo (é isto que o Instituto opera no dia a dia)

### 1. Instalar o Node.js (uma vez)

1. Abra [nodejs.org](https://nodejs.org) e baixe o instalador **LTS** (o botão
   verde — versão 22.13 ou mais nova; recomendada a 24).
2. Instale com "avançar, avançar, concluir". Nada precisa ser configurado.

### 2. Copiar a pasta do Percurso

Duas formas — escolha a mais fácil para você:

- **Pen drive / pasta compartilhada:** copie a pasta inteira do projeto para o
  computador (ex.: para `Documentos/percurso`). Pronto.
- **Pelo GitHub** (se alguém do grupo ajudar uma vez):
  `git clone https://github.com/igorregoir-lgtm/percurso-mvp.git`

### 3. Ligar

Abra o Terminal (macOS: Launchpad → Terminal; Windows: menu Iniciar → digite
`cmd`), entre na pasta e rode:

```bash
cd caminho/da/pasta/percurso
node server.js
```

Abra **http://localhost:3000** no navegador. Na primeira vez o banco é criado
e populado sozinho com os dados sintéticos de demonstração.

**É só isso.** Enquanto essa janela do Terminal estiver aberta, o Percurso está
no ar neste computador.

### 4. Backup (o único cuidado recorrente)

O banco inteiro é **um arquivo**: `data/percurso.db`. Backup = copiar esse
arquivo para um pen drive ou nuvem de vez em quando (com o servidor parado;
com ele ligado, copie também os vizinhos `-wal` e `-shm` juntos). Restaurar =
copiar de volta.

### 5. Ligar sozinho quando o computador liga (opcional, recomendado)

Para ninguém precisar lembrar do Terminal:

**macOS** — rode uma vez, dentro da pasta do projeto:

```bash
ai/scripts/instalar-inicio-automatico.sh
```

Isso registra o Percurso no login do usuário (LaunchAgent). A partir daí, ligou
o computador → o Percurso está no ar em http://localhost:3000. Para desfazer:
`ai/scripts/instalar-inicio-automatico.sh --remover`.

**Windows** — crie um atalho:
1. Na pasta do projeto, crie um arquivo `percurso.bat` com uma linha:
   `node server.js`
2. Aperte `Win+R`, digite `shell:startup`, Enter — e arraste o atalho do
   `.bat` para a pasta que abriu.

### O que NUNCA precisa ser feito

- `npm install` — não há dependências.
- Atualização de pacote/plataforma — não há pacote nem plataforma.
- Pagamento — não há licença, API paga nem mensalidade.
- Mexer em código — operar é ligar, usar e copiar o arquivo de backup.

---

## Parte 2 — A camada de IA local (opcional)

O copilot ("Refletir") e a explicação do SROI rodam num modelo de linguagem
**dentro do próprio computador** — nada sai da máquina, custo zero por uso.
Exige um computador razoável (**8 GB de RAM livres**; funciona melhor em Mac
com chip Apple). **Sem esta parte, o Percurso funciona por inteiro** — as telas
de IA apenas avisam que a camada está desligada.

### 1. Instalar o executor do modelo (llama.cpp)

- **macOS:** instale o [Homebrew](https://brew.sh) (uma linha, do site) e rode:
  `brew install llama.cpp`
- **Windows/Linux:** baixe o pacote pronto em
  [github.com/ggml-org/llama.cpp/releases](https://github.com/ggml-org/llama.cpp/releases)
  (procure `llama-server`) e deixe o executável no PATH.

### 2. Baixar o modelo (uma vez, ~2,5 GB)

Na pasta do projeto:

```bash
ai/scripts/setup-model.sh
```

O script baixa os arquivos e **confere a integridade** (SHA-256) — se a conexão
cair no meio, rode de novo: ele retoma e valida. (Windows sem bash: os links e
os códigos de verificação estão em `ai/model-manifest.json` — baixe pelo
navegador para a pasta `models/`.)

### 3. Ligar com IA

```bash
ai/scripts/start-llama.sh        # terminal 1 — o modelo (fica aberto)
AI_ENABLED=1 node server.js      # terminal 2 — o Percurso com "Refletir" ativo
```

> Em operação real com educadoras, ligar a IA é condicionado ao resultado da
> prova de conceito com pedagogos (`docs/POC-COPILOT.md`). Até lá, use para
> demonstração.

---

## Parte 3 — Mostrar no celular (demonstração)

Com `cloudflared` e `qrencode` instalados na máquina que apresenta
(macOS: `brew install cloudflared qrencode`):

```bash
ai/scripts/demo-celular.sh
```

O script sobe tudo (modelo + app + túnel HTTPS temporário), imprime um **QR
code** — qualquer celular (iPhone ou Android) aponta a câmera e abre o
Percurso instalável, com voz funcionando. `Ctrl+C` derruba tudo e a URL deixa
de existir. **Isso é ferramenta de demonstração**, não o modo de operação:
a URL é pública e efêmera, e os dados devem ser os sintéticos.

---

## Resolução de problemas (os três que acontecem)

| Sintoma | Causa | Solução |
|---|---|---|
| `node: command not found` | Node não instalado (ou Terminal aberto antes da instalação) | Instale o LTS em nodejs.org e abra um Terminal NOVO |
| O navegador não abre localhost:3000 | O servidor não está rodando | Volte ao Terminal e rode `node server.js` na pasta certa |
| Tela "Refletir" diz que a IA está desligada | É o padrão — a IA é opcional | Parte 2 acima; ou simplesmente ignore: o produto inteiro funciona sem ela |
| O assistente ❋ (Passo) responde "pelo guia" | Normal sem IA ligada: ele responde pelo guia do produto, sempre | Com a IA ligada (Parte 2), as respostas ficam mais naturais — o conteúdo é o mesmo |

Para voltar aos dados de demonstração a qualquer momento (pode rodar com o
servidor no ar; recarregue a página depois): `node scripts/reset.mjs`.
