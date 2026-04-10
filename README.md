# Meu Ponto 📋

App web para registrar ponto de trabalho fotografando os tickets diários.  
Sem instalação. Funciona direto no navegador do celular.

## Funcionalidades

- Fotografar 4 tickets por dia: Entrada, Início almoço, Fim almoço, Saída
- Câmera abre diretamente ao tocar no quadro (no celular)
- Horário registrado automaticamente no momento da foto
- Histórico de todos os dias registrados
- Cálculo automático de horas trabalhadas (descontando almoço)
- Exportar registro do dia em `.csv`
- Funciona como PWA (pode adicionar à tela inicial do celular)

## Estrutura do projeto

```
registro-ponto/
├── index.html          # Página principal
├── vercel.json         # Configuração da Vercel
├── public/
│   ├── manifest.json   # PWA manifest
│   ├── icon-192.png    # Ícone do app (adicionar manualmente)
│   └── icon-512.png    # Ícone do app (adicionar manualmente)
└── src/
    ├── style.css       # Estilos
    └── app.js          # Lógica do app
```

## Como publicar na Vercel

### Opção 1 — Via GitHub (recomendado)

1. Crie um repositório no GitHub e faça push deste projeto:
   ```bash
   git init
   git add .
   git commit -m "primeiro commit"
   git branch -M main
   git remote add origin https://github.com/SEU_USUARIO/registro-ponto.git
   git push -u origin main
   ```

2. Acesse [vercel.com](https://vercel.com) e faça login

3. Clique em **"Add New Project"** → importe o repositório

4. Clique em **"Deploy"** — pronto!

### Opção 2 — Via Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Ícones (opcional, mas recomendado)

Para que o app apareça corretamente ao adicionar à tela inicial,  
adicione dois arquivos PNG em `/public/`:
- `icon-192.png` — 192×192 pixels
- `icon-512.png` — 512×512 pixels

Use qualquer editor de imagem ou gerador online de ícones PWA.

## Usar no celular

1. Acesse a URL do app no Chrome (Android) ou Safari (iOS)
2. Toque em **"Compartilhar"** → **"Adicionar à tela inicial"**
3. O app abrirá em tela cheia, como um app nativo
4. Ao tocar em qualquer quadro de ponto, a câmera abre diretamente

## Dados

Os registros ficam salvos no `localStorage` do navegador.  
Use sempre o mesmo navegador no celular para manter o histórico.

> ⚠️ Limpar os dados do site apaga o histórico.  
> Use a função **Exportar** regularmente para guardar uma cópia.
