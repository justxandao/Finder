# PokeXGames Finder

O **PokeXGames Finder** é um aplicativo desktop projetado para auxiliar jogadores na localização, rastreamento e cálculo de coordenadas e interseções dentro do jogo. Ele ajuda você a triangular baús, dungeons e outras áreas de interesse usando as mecânicas de radar de distâncias.

Originalmente desenvolvido em Vanilla JS e Electron, este projeto foi migrado e reconstruído usando **React**, **Vite** e **Tauri**, proporcionando uma arquitetura muito mais leve, fluida e com baixo uso de memória RAM.

## 🚀 Tecnologias Utilizadas

* **[Tauri 2.0](https://tauri.app/)**: Framework de backend e janela (substituindo o Electron), utilizando binários nativos ultra-leves e seguros construídos em Rust.
* **[React 19](https://react.dev/)**: Biblioteca frontend para criação da interface de forma componentizada.
* **[Vite](https://vitejs.dev/)**: Bundler moderno e absurdamente rápido para ambiente de desenvolvimento e build.
* **[Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)**: Motor de mapas em blocos, desenhando o mundo de Kanto, Orange Archipelago e Johto de forma performática.
* **[Turf.js](https://turfjs.org/)**: Biblioteca avançada de geoprocessamento matemático, utilizada para calcular a intersecção exata dos radares de distância e desenhar as áreas prováveis no mapa.
* **[Zustand](https://github.com/pmndrs/zustand)**: Gerenciamento de estado global limpo e simplificado.

## 📦 Como Instalar e Rodar

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão mais recente recomendada)
* As dependências do Tauri para seu sistema operacional (no Windows, você precisará ter instalado as [Ferramentas de Build do C++ (Visual Studio)](https://tauri.app/v1/guides/getting-started/prerequisites)).

### Passo a Passo

1. **Instale as dependências NPM:**
   ```bash
   npm install
   ```

2. **Inicie o ambiente de Desenvolvimento:**
   O comando abaixo irá rodar o React (via Vite) na porta 1420 e iniciar a janela nativa do Tauri. A primeira vez pode demorar alguns minutos pois o Rust irá compilar o backend.
   ```bash
   npm run tauri dev
   ```

3. **Gerar Build Final (Instalador):**
   Para compilar a aplicação para um arquivo `.exe` (ou `.msi`) otimizado, rode:
   ```bash
   npm run tauri build
   ```
   Os instaladores serão gerados na pasta `src-tauri/target/release/bundle`.

## 🗂️ Estrutura do Projeto

* `public/`: Contém os assets pesados que não passam pelo Vite (tilesheets dos mapas `tiles` e `tiles_johto`, banco de dados em `locations.json` e `spawns.json`, imagens soltas).
* `src/`: Todo o código fonte em React.
  * `components/`: Componentes visuais como os sidebars, mapa (`MapView.jsx`), modais de painel BI, gavetas de configuração, etc.
  * `store/`: Contém a loja global do Zustand (`useStore.js`).
  * `utils/`: Funções de utilidade e matemática, especialmente a conversão de ângulos e a integração pesada do Turf.js (`geometry.js`).
* `src-tauri/`: O backend do aplicativo escrito em Rust e configurações do Tauri (`tauri.conf.json`).

## ⚙️ Branchs Disponíveis

O código antigo (Vanilla JS + HTML puro + NodeJS/Electron) encontra-se guardado na branch `legacy-electron`.

---

**PokeXGames Finder** - Feito para facilitar a caça!
