# Percurso — Entrega da Semana 10

**Instituto Ebenézer · Desafio B (monitoramento de impacto) · Módulo 3 · MBA Inteli · Grupo 06**
Prazo: 09/10/2026, 23h59 · submissão individual na Adalove (turma Módulo 3)

## O que está nesta pasta

| Arquivo | Trilha | O que é |
|---|---|---|
| `01_Handover_Percurso_Semana10.pdf` | Tecnologia | **Comece por aqui.** O documento de handover: os cinco itens do guia (vídeo, modelo de dados, instalação e acesso, evidências de teste, decisões técnicas) e quem opera depois da entrega |
| `02_Evidencias_de_Teste_Semana10.pdf` | Tecnologia | Sete baterias, nenhuma falha; persistência após reiniciar o servidor; 17 testes de quebra no formato situação → esperado → obtido |
| `03_Modelo_de_Dados_ER.pdf` | Tecnologia | Diagrama entidade-relacionamento gerado do esquema real (32 tabelas) |
| `04_Video_Demonstrativo_Percurso.mp4` | Tecnologia | Vídeo demonstrativo do fluxo principal, com os quatro papéis |
| `05_Pitch_Deck_Business_Case.pdf` | Negócios | **Comece por aqui (Negócios).** Pitch Deck em 12 slides, na estrutura de 5 blocos: abertura, problema e solução, mercado e produto, time e números, fechamento. Mostra as telas de cada função e a geração do relatório; ROI, VPL e Payback ficam no Business Case (`06`) |
| `06_Business_Case_Percurso_Semana10.pdf` | Negócios | Business Case completo: base financeira 2025 real e 2026 projetada, ROI/VPL/Payback em três cenários, custo total de operação, adoção, sustentação, riscos e cronograma (`.docx` editável ao lado) |
| `07_Modelo_Financeiro_Percurso_Semana10.xlsx` | Negócios | Planilha do modelo: cada número com a origem marcada (real 2025, mercado com data, premissa a medir no piloto) |
| `08_Roteiro_de_Apresentacao.pdf` | Apoio | Roteiro do pitch: fala de cada slide com tempo (≈ 7m40s), demonstração ao vivo, perguntas prováveis e respostas (`.md` editável ao lado) |

## Links

- **Deck do pitch (versão navegável):** https://claude.ai/artifact/WqiSRSQt7iZEDtGmZbfYJ2
- **Repositório (código, documentação e testes):** https://github.com/igorregoir-lgtm/percurso-mvp
- **Protótipo Figma (canônico, 27 telas, 4 papéis):** https://www.figma.com/design/h6AnLVYLfpeVl2N4ie0Qzv

## Rodar em 1 minuto

Requisito único: Node.js 22.13 ou mais novo ([nodejs.org](https://nodejs.org)). Sem `npm install`, sem build, sem conta.

```
git clone https://github.com/igorregoir-lgtm/percurso-mvp.git
cd percurso-mvp
node server.js
```

Abra http://localhost:3000 e entre com um dos perfis de demonstração: **Maria Silvia**
(educadora), **Rita Amaral** (coordenação) ou **Solange Ribeiro** (diretoria). São personagens
fictícios da base sintética — todos os dados do app são sintéticos.
