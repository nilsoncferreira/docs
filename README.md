# Acervo docente – Nilson Clementino Ferreira

Site estático (HTML, CSS e JavaScript, sem build) que organiza 171 documentos digitalizados e 16 relatórios de atividade docente (RADOC 2010–2021 e SICAD+ 2022–2025), por categoria e em ordem cronológica, com painel interativo.

**Seções:** Acervo (filtros, busca, visualizador) · Linha do tempo · Painel (gráficos e tabelas) · Relatórios anuais (conteúdo de cada ano em tabelas).

## Publicar no GitHub Pages
1. Crie um repositório e envie todo o conteúdo desta pasta (inclusive `.nojekyll`).
2. Em *Settings → Pages*, escolha *Deploy from a branch*, ramo `main`, pasta `/ (root)`.
3. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

Depois de alterar qualquer arquivo, mude o número `?v=` dos scripts em `index.html` para o navegador não usar a versão em cache.

Para testar localmente, basta dar duplo clique em `index.html`.

## Documentos no Google Drive
O site **não contém** as imagens nem os PDFs originais: cada documento abre direto da pasta compartilhada do Drive (https://drive.google.com/drive/folders/15L8JhXmXdvmCTdfVuy499cZT7glCuXCf), pelo identificador gravado no campo `gid` de `data/documents.json`. Quem visita o site só vê os documentos se o Drive permitir (arquivos compartilhados por link).

### Sem repetidos e na posição correta
- Cópias repetidas ("2ª via", "2ª cópia") continuam na pasta do Drive, mas **não aparecem no site**: o catálogo marca a cópia com `"dup":"<id do original>"` e o `app.js` também ignora, sozinho, o mesmo `gid` repetido e qualquer "2ª via" de um documento já existente.
- O campo `rot` de `assets/js/data.js` só é usado quando o arquivo do Drive chega deitado (hoje, 90° nos escaneados de lado). O Drive já entrega os demais na posição de leitura; por isso `rot` não deve ser usado para 180°. As miniaturas de `assets/js/thumbs.js` já estão na posição correta.

## Privacidade (leia antes de publicar)
Vários documentos têm RG, CPF, matrícula, SIAPE, filiação e nomes de alunos (marcados como "dados pessoais"). O repositório público contém apenas miniaturas de baixa resolução (`assets/js/thumbs.js`) e os dados extraídos dos relatórios; quem tiver o link do Drive acessa os originais. Para restringir, mude o compartilhamento da pasta no Drive para pessoas específicas, ou remova de `assets/js/data.js` e de `assets/js/thumbs.js` os itens com `"s":1`. A opção "Desfocar documentos pessoais" só desfoca as miniaturas na tela.

## Estrutura
- `index.html`, `assets/css/style.css`, `assets/js/app.js` (acervo e visualizador), `assets/js/viz.js` (régua, linha do tempo, painel, relatórios)
- `assets/vendor/d3.min.js` (D3, licença ISC)
- `assets/js/data.js` (catálogo e dados dos relatórios, carregados direto no navegador; o site funciona até abrindo `index.html` com duplo clique)
- `robots.txt` e `<meta name="robots">` pedem aos buscadores que não indexem o site; `404.html` e `.gitignore` já incluídos (dados extraídos dos relatórios; nomes de orientandos removidos)
- `assets/js/thumbs.js` (miniaturas dos documentos, embutidas)

## Atualizar
Envie o arquivo à pasta do Drive e adicione uma entrada em `assets/js/data.js` (lista `docs`) (campos: `id`, `kind`, `t`, `c`, `d`, `i`, `x`, `s`, `gid` (ID do arquivo no Drive), `th`).
