# SimViveiro MT — Planner Técnico de Viveiro Florestal

Simulador front-end para planejamento técnico-operacional de um viveiro florestal voltado à produção de mudas clonais de **Eucalyptus urophylla** e mudas seminais de **Tectona grandis**.

O projeto foi desenhado para ser usado como complemento visual e analítico de um trabalho acadêmico/consultivo de viveiro florestal, com foco em capacidade de produção, ocupação das fases, gargalos, planta conceitual e bioestatística básica.

## O que o simulador faz

- Ajusta metas anuais de produção de Eucalyptus e teca.
- Calcula necessidade de miniestacas, frutos/sementes, bandejas e canteiros.
- Estima ocupação simultânea da casa de vegetação, casa de sombra, área de crescimento/rustificação e canteiros de teca.
- Identifica gargalos operacionais por ocupação acima de 85% ou 100%.
- Gera uma planta baixa conceitual dinâmica, com cores por nível de ocupação.
- Calcula demanda hídrica aproximada no pico operacional.
- Estima equipe operacional com base em produtividade anual por colaborador.
- Aplica bioestatística básica: intervalo de confiança de proporções, tamanho amostral e simulação Monte Carlo.
- Exporta resumo executivo, JSON do cenário e CSV com indicadores.

## Stack

Este MVP usa HTML, CSS e JavaScript puro, sem etapa de build. A escolha foi proposital para facilitar publicação direta no GitHub Pages e reduzir risco de erro em apresentação.

Uma evolução natural seria migrar para Vite + React + TypeScript + Recharts, mantendo os mesmos cálculos centrais.

## Como rodar localmente

Abra o arquivo `index.html` diretamente no navegador.

Também é possível subir um servidor local simples:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub, por exemplo: `simviveiro-mt`.
2. Faça upload dos arquivos `index.html`, `styles.css`, `app.js` e `README.md` para a raiz do repositório.
3. Acesse `Settings` → `Pages`.
4. Em `Build and deployment`, selecione `Deploy from a branch`.
5. Escolha a branch `main` e a pasta `/root`.
6. Salve. O GitHub fornecerá uma URL pública.

## Observações técnicas

Os números iniciais são parâmetros de projeto e podem ser ajustados no painel. O simulador não substitui dimensionamento executivo, laudos de sementes, projeto hidráulico, cotações reais ou responsabilidade técnica. Ele serve como ferramenta de apoio à decisão, apresentação, ensino e refinamento de cenários.

