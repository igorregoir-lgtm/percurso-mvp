# -*- coding: utf-8 -*-
# Gera figjam-dados.js a partir de jornada.json (mesma fonte de verdade do PNG).
# O arquivo é o conteúdo no formato usado para montar/atualizar o board FigJam nativo.
import json

J = json.load(open('jornada.json', encoding='utf-8'))

PREF = {
    'ONDE O PRODUTO ENTRA:': 'entra',
    'ONDE O PRODUTO AINDA NÃO ENTRA:': ('falta', 'AINDA NÃO ENTRA: '),
    'ONDE O PRODUTO NÃO ENTRA:': ('falta', 'NÃO ENTRA: '),
    'O QUE FALTA NA TELA:': ('falta', 'FALTA NA TELA: '),
    'O QUE NÃO PODE SER PERDIDO:': ('falta', 'JÁ FUNCIONA, NÃO PERDER: '),
    'SE NADA FOR REGISTRADO:': 'rede',
}

fases = []
for f in J['fases']:
    linha = {'n': f['numero'], 'nome': f['nome'], 'emoji': f['emoji'], 'emo': f['emocao'],
             'hoje': [], 'entra': [], 'rede': [], 'falta': []}
    for a in f['acoes']:
        for p, destino in PREF.items():
            if a.startswith(p):
                corpo = a[len(p):].strip()
                if isinstance(destino, tuple):
                    linha[destino[0]].append(destino[1] + corpo)
                else:
                    linha[destino].append(corpo)
                break
        else:
            linha['hoje'].append(a)
    linha['cit'] = f['citacao'].replace('\n', ' ')
    linha['tipo'] = f['tipoCitacao']
    linha['fonte'] = f['fonte']
    fases.append(linha)

D = {
    'titulo': J['titulo'],
    'subtitulo': J['subtitulo'],
    'persona': J['persona'],
    'cenario': J['cenario'],
    'exp': J['expectativas'],
    'principio': J['principio'],
    'fases': fases,
    'mv': J['momentosDaVerdade'],
    'linhas': [
        ['A FASE', ''],
        ['COMO ELA CHEGA', 'estado emocional'],
        ['COMO É HOJE', 'sem o produto'],
        ['ONDE O PERCURSO ENTRA', 'o que muda'],
        ['SE ELA NÃO REGISTRAR NADA', 'a rede de segurança'],
        ['ONDE ELE NÃO ENTRA', 'limite declarado'],
        ['A FALA DA VISITA', 'citação literal, conferida'],
    ],
}

js = 'const D = ' + json.dumps(D, ensure_ascii=False) + ';\n'
open('figjam-dados.js', 'w', encoding='utf-8').write(js)
print('figjam-dados.js gerado —', len(js), 'bytes ·', len(fases), 'fases ·',
      len(D['linhas']), 'linhas de tabela')
