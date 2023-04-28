<img src="https://user-images.githubusercontent.com/114384910/202768806-c7f8065f-113c-4762-8c10-ff57ff8ef72c.jpg"/>

<h1 align="center">Welcome to Vite Electron React Boilerplate 👋</h1>

<p align="center">
   <a href="https://github.com/stackoutput-com/vite-electron-react-boilerplate#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/Documentation-yes-brightgreen.svg" />
  </a>
   <img alt="Version" src="https://img.shields.io/badge/Version-1.0.0-blue.svg?cacheSeconds=2592000" />
   <a href="https://github.com/prettier/prettier" target="_blank">
    <img alt="prettier" src="https://img.shields.io/badge/Code_style-prettier-ff69b4.svg?style=flat-square" />
  </a>
  <a href="https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

Develop your Desktop Apps **Blazingly Fast🔥** with **Vite**, **Electron + Vitejs + React + Typescript = Awesome❤️**

**Vite Electron React Boilerplate** is help you to build multi-platform desktop apps easier. **Don't worry about the configuration 🔨** this template will take care of that, focus on your codes⌨️ million dollar projects and project ideas 💡. The idea is to solve the common issues with connecting those frameworks, build a robust Template to support daily development needs, and help developers use better practices while working with popular JavaScript components.

## 📚 Before You Begin

Before you begin we recommend you read about the basic building blocks that assemble a **Vite Electron React Boilerplate**:

- **Node.js** - Start by going through [Node.js Official Website](http://nodejs.org/) and this [StackOverflow Thread](http://stackoverflow.com/questions/2353818/how-do-i-get-started-with-node-js), which should get you going with the Node.js platform in no time.

- **Electron.js** - The best way to understand Electron is through its [Official Website](https://www.electronjs.org/), which has a [Getting Started](https://www.electronjs.org/docs/latest) guide, You can also go through this [TutorialsPoint Guide](https://www.tutorialspoint.com/electron/index.htm) for more resources.

- **React.js** - React's [Official Website](https://reactjs.org/) is a great starting point. You can also use [W3Schools Popular Guide](https://www.w3schools.com/REACT/DEFAULT.ASP), and [Egghead Videos](https://egghead.io/).

- **Vite.js** - Vite's [Official Website](https://vitejs.dev/) is a great starting point. If your facing bugs and issues checkout the [Issue](https://github.com/vitejs/vite/issues) page.

- **TypeScript** - Go through [TypeScript Official Website](https://www.typescriptlang.org/) and proceed to their [Official Manual](https://www.typescriptlang.org/docs/), which should help you understand TypeScript better.

## 🖥️ Prerequisites

Make sure you have installed all of the following prerequisites on your development machine:

- **Git** - [Download & Install Git](https://git-scm.com/downloads). OSX and Linux machines typically have this already installed.
- **Node.js** - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager. If you encounter any problems, you can also use this [GitHub Gist](https://gist.github.com/isaacs/579814) to install Node.js.

NOTE: This project requires NodeJS (version 14 or later) and NPM.
[Node](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.

## ⏩ Table of contents

- [Before You Begin](#-before-you-begin)
- [Prerequisites](#%EF%B8%8F-prerequisites)
- [Table of contents](#-table-of-contents)
- [Features](#-features)
- [Getting Started](#%EF%B8%8F-getting-started)
- [Directory Structure](#-directory-structure)
- [Quick Start](#-quick-start)
  - [Cloning The GitHub Repository](#-cloning-the-github-repository)
  - [Downloading The Repository Zip File](#%EF%B8%8F-downloading-the-repository-zip-file)
  - [Quick Install](#-quick-install)
- [Starting Development](#-starting-development)
  - [Running Your Application](#-running-your-application)
  - [Change Port Number](#-change-port-number)
  - [Vscode Debugging](#-vscode-debugging)
  - [Clean Cache](#-clean-cache)
  - [Style your Code](#-style-your-code)
  - [Git Commits](#%EF%B8%8F-git-commits)
- [Packaging for Production](#-packaging-for-production)
  - [Running in Production mode](#%EF%B8%8F-running-in-production-mode)
  - [Debugging in Production mode](#-debugging-in-production-mode)
  - [Debugging in Release Build](#-debugging-in-release-build)
- [Release a Distribution Version](#-release-a-distribution-version)
  - [Build for Windows](#%EF%B8%8F-build-for-windows)
  - [Build for macOS](#-build-for-macos)
  - [Build for Linux](#-build-for-linux)
- [Tech Used](#%EF%B8%8F-tech-used)
- [Contributing](#-contributing)
- [Credits](#-credits)
- [Show your support](#-show-your-support)
- [Donate](#-donate)
- [Authors](#%EF%B8%8F-author)
- [License](#%EF%B8%8F-license)

<!-- ### 🏠 [Homepage](https://github.com/AjayKanniyappan/react-electron-template) -->

## 🔍 Features

- 🐞 Vscode debugging
- ✨ **HMR** Using Vite
- 🔥 Hot Reload
- 📦 Packaging for Production
- 🎯 Make Development simple
- 💪 Eslint, Prettier and Airbnb make your code stronger
- 💽 local Storage using **Electron-Store** and Auto updater using **Electron-Updater**
- 🖥 Build your application for multi-platform

## 🏃‍♂️ Getting Started

These instructions will get you a copy of the project and running on your local machine for development and testing purposes. See Distribution for notes on how to Package the Application for Desktop.

## 📂 Directory Structure

**Vite Electron React Boilerplate** files and folder structure.

```diff
+├── .husky                       Automate your git commits
+├── .vscode                      vscode debug folder and extension support
+├── app                          Your application Build folder
 │   ├── dist                     Your generated source code folder
+│   └── package.json             Your runnable application package.json (If you want native node module you need to add here)
 │
+├── assets                       Project assets folder
 │   ├── icons                    Icon sets folder
 │   │  └── NxN.png               Different pixel png's
 │   ├── icon.icns                Icon for the application on macOS and Linux
 │   └── icon.ico                 Icon for the application
 │
+├── configs                      configuration folder
+│   └── vite.config.ts           Vite Configurations
 │
+├── release                      your application release folder
+│   └── build                    Generated after production build, contains executables
 │       ├── {os}-unpacked        Contains unpacked application executable
 │       └── Setup.{ext}          Installer for the application
 │
+├── src                          Source code folder
+│   ├── main                     Electron related code
 │   │   ├── main.ts              Main process source code
 │   │   └── preload.ts           Preload scripts source code
 │   │
+│   └── renderer                 Renderer source code, your React application
 │       ├── Components           Your Components here
 │       │   └── Home.tsx         Edit and Save to test HMR
 │       ├── App.tsx              React router source code
 │       └── index.tsx            React index source code
 │
 ├── .editorconfig                Editor configuration
 ├── .eslintrc.json               Eslint configuration
 ├── .prettierrc                  prettier code formatter
+├── DevConfig.json               React development port
+├── electron-builder.yml         Electron builder configuration
+├── package.json                 Package.json for development
 ├── tsconfig.json                TypeScript Configuration
+└── tsconfig.node.json           TypeScript paths
```

## 🛫 Quick Start

There are several ways you can get the **Vite Electron React Boilerplate**:

### 🌀 Cloning The GitHub Repository

The recommended way to get **Vite Electron React Boilerplate** is to use git to directly clone the repository:

```bash
# Clone the project
git clone https://github.com/stackoutput-com/vite-electron-react-boilerplate.git <your-project-name>

# Enter the project directory
cd <your-project-name>
```

This will clone the latest version of the Vite Electron React Boilerplate repository to a **your-project-name** folder.

### 🗃️ Downloading The Repository Zip File

Another way to use the **Vite Electron React Boilerplate** is to download a zip copy from the [main branch on GitHub](https://github.com/stackoutput-com/vite-electron-react-boilerplate/archive/refs/heads/main.zip). You can also do this using the `wget` command:

```sh
wget https://github.com/stackoutput-com/vite-electron-react-boilerplate/archive/refs/heads/main.zip -O vite-electron-react-boilerplate-main.zip; unzip vite-electron-react-boilerplate-main.zip; rm vite-electron-react-boilerplate-main.zip
```

Don't forget to rename **vite-electron-react-boilerplate-main** after your project name.

### 🧰 Quick Install

Once you've downloaded the Template and installed all the prerequisites, you're just a few steps away from starting to develop your Vite, Electron, React application.

The Template comes pre-bundled with a `package.json` file that contain the list of modules you need to start your application.

To install the dependencies, run this in the application folder from the command-line:

```bash
# Install dependency
npm install
```

Or if you prefer using Yarn:

```bash
# Install dependency
yarn install
```

This command does a few things:

- First it will install the dependencies needed for the application to run.
- If you're running in a development environment, it will then also install development dependencies needed for testing and running your application.

## 👨‍💻 Starting Development

Use your favorite JavaScript Package Managers **npm** or **yarn** or **pnpm**

### 🏃 Running Your Application

**Run your application using npm:**

```sh
npm start
```

Or if you prefer using Yarn:

```sh
yarn start
```

![image](https://user-images.githubusercontent.com/114384910/202861777-c1f849e1-f91a-4f3e-97b5-1300c08e7358.png)

Your **React** application should run on default port http://localhost:7070 on top of **Electron** with the development environment configuration.

Explore **configs/vite.config.ts** for development environment configuration options.

### 🛬 Change Port Number

If the localhost 7070 port number already in use! or if you like to change your **React application number.**

Go to 👉 DevConfig.json and change the port number 7070 to **your-port-number**

![Port](https://user-images.githubusercontent.com/114384910/202861348-6d8cd264-e3a4-4229-a1a3-d408c32d902a.png)

### 🆚 Vscode Debugging

This guide goes over how to start **VSCode debugging** your **React, Electron** Project.

you can easily debug this [Vite Electron React Boilerplate](https://github.com/stackoutput-com/vite-electron-react-boilerplate).

To bring up the Run and Debug view, select the Run and Debug icon in the Activity Bar on the side of VS Code. You can also use the keyboard shortcut `Ctrl+Shift+D`.

![Untitled-3](https://user-images.githubusercontent.com/114384910/201532224-1cbf49e6-5511-4d42-82f0-319198ac0e5c.png)

Click the button or press `F5` to start debugging

**Electron main process Debugging**

NOTE: **Currently** Electron main process **(VScode)** debugging feature is not available, It will be added soon.

**Electron renderer process Debugging**

If you want to debug your **ReactJS** also called renderer code in Vscode, Go to Run and debug section or use the keyboard shortcut `Ctrl+Shift+D`.

- Add break 🚧 points 🛑 in your code or files.
- Change the **Electron:main** to **Electron:renderer** to debug the renderer process.
- Click green button to run debug or press `F5` to start debugging.

![Renderer](https://user-images.githubusercontent.com/114384910/202862623-e49275f5-2c70-41ee-a604-b0f5f62fbeba.png)

NOTE: First run **Electron:main** then only you can debug the **Electron:renderer** process.

### 🧹 Clean Cache

If you want clean the cache files and node_modules cache run this below command 👇:

```sh
npm run clean
```

NOTE: It will remove your **node_module** folder, **build** files and **package-lock.json** files.

Or if you prefer to clean only build files and folder run this below command 👇:

```sh
npm run clean:build
```

Or if you prefer to clean only dist files and folder run this below command 👇:

```sh
npm run clean:dist
```

### 💈 Style your Code

The [Vite Electron React Boilerplate](https://github.com/stackoutput-com/vite-electron-react-boilerplate) has [Eslint](https://eslint.org/), [Prettier](https://prettier.io/) and [Airbnb](https://airbnb.io/javascript/react/) Configurations, this will help you to Style your code and syntax check and more.

[Eslint](https://eslint.org/) will check syntax, find problems, and enforce code style of your code.

[Prettier](https://prettier.io/) will format your code style.

All you have to do is run this below command 👇:

```sh
npm run lint
```

NOTE: This command show you the warnings and errors in your code.

### 🛰️ Git Commits

Automate your [Git](https://git-scm.com/) commits using Husky, and don't commit or push the bad code in git.

Husky improves your commits and more, You can use it to lint your commit messages, run tests, lint code, etc... when you commit or push. Husky supports [all Git hooks](https://git-scm.com/docs/githooks).

Run below command 👇 to prepare Husky:

```sh
npm run prepare
```

See docs and more about [Husky](https://typicode.github.io/husky/#/?id=features).

That's it! Your application should be running. To proceed with your development, check the other sections in this documentation. If you encounter any problems, Feel free to check [issues page](https://github.com/stackoutput-com/vite-electron-react-boilerplate/issues).

## ⚡ Packaging for Production

This documentation will teach you how to move your **Code** on **Production**.

### 🏃‍♂️ Running in Production mode

To run your code on production mode run this command 👇:

```sh
npm run prod
```

NOTE: It will run both **Electron**, **React** code in production mode.

### 🐞 Debugging in Production mode

If you need to debug your application on production mode run this 👇 command and it will show you the Electron **DevTools** for debugging.

```sh
npm run prod:debug
```

NOTE: Its only for testing purpose.

### 🐞 Debugging in Release Build

If you want to test your executable or installer application, just run this 👇 command and it will show you the Electron **DevTools** for debugging.

```sh
npm run build:debug
```

NOTE: This is testing build only, don't move it for **Distribution**.

## 📦 Release a Distribution Version

This guide will teach you how to build and distribute your application for **multi-platform**, It time to release your million dollar projects.

**NOTE:** To avoid **Unknown publisher** error's you need to [Code Signing](https://www.venafi.com/education-center/code-signing/what-is-code-signing) on your project for more read this [Documentation .](https://www.electronjs.org/docs/latest/tutorial/distribution-overview)

### 🖥️ Build for Windows

Once your app is ready for production or you completed a development process, To package and distribute your application for **Windows** Platform, you need to re-brand it. To do this below 👇:

- Go to [electron-builder.yml](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/electron-builder.yml) change the name, appID, icon and what are the configuration you want.

- Also change the [package.json](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/package.json) name, version and your what needs.

- All you finish the process, you need to run this command 👇 it will make you the build for distribution file for Windows:

```sh
npm run make:win
```

NOTE: If you want to publish your application in [Windows Store](https://apps.microsoft.com/store/apps) kindly read this 🙏 [Documentation .](https://www.electronjs.org/docs/latest/tutorial/windows-store-guide)

### 🍎 Build for macOS

Once your app is ready for production or you completed a development process, To package and distribute your application for **macOS** Platform, you need to re-brand it. To do this below 👇:

- Go to [electron-builder.yml](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/electron-builder.yml) change the name, appID, icon and what are the configuration you want.

- Also change the [package.json](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/package.json) name, version and your what needs.

- All you finish the process, you need to run this command 👇 it will make you the build for distribution file for macOS:

```sh
npm run make:mac
```

NOTE: If you want to publish your application in [Mac App Store](https://www.apple.com/in/app-store/) kindly read this 🙏 [Documentation .](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide)

### 🐧 Build for Linux

Once your app is ready for production or you completed a development process, To package and distribute your application for **Linux** Platform, you need to re-brand it. To do this below 👇:

- Go to [electron-builder.yml](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/electron-builder.yml) change the name, appID, icon and what are the configuration you want.

- Also change the [package.json](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/package.json) name, version and your what needs.

- All you finish the process, you need to run this command 👇 it will make you the build for distribution file for Linux:

```sh
npm run make:linux
```

NOTE: If you want to publish your application in [Snapcraft](https://snapcraft.io/) kindly read this 🙏 [Documentation .](https://www.electronjs.org/docs/latest/tutorial/snapcraft)

## 🏗️ Tech Used

**Vite Electron React Boilerplate** Built With

- <img src="https://img.shields.io/badge/React%20-%2361DAFB.svg?&style=for-the-badge&logo=React&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/React_Router%20-%23CA4245.svg?&style=for-the-badge&logo=React%20Router&logoColor=white"/> 
  <br/>
- <img src="https://img.shields.io/badge/Electron%20-%2347848F.svg?&style=for-the-badge&logo=Electron&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/JavaScript%20-%23F7DF1E.svg?&style=for-the-badge&logo=JavaScript&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/TypeScript%20-%233178C6.svg?&style=for-the-badge&logo=TypeScript&logoColor=white"/> 
  <br/>
- <img src="https://img.shields.io/badge/HTML5%20-%23E34F26.svg?&style=for-the-badge&logo=HTML5&logoColor=white"/>   
  <br/>
- <img src="https://img.shields.io/badge/CSS3%20-%231572B6.svg?&style=for-the-badge&logo=CSS3&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/Sass%20-%23CC6699.svg?&style=for-the-badge&logo=Sass&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/Node.js%20-%23339933.svg?&style=for-the-badge&logo=Node.js&logoColor=white"/> 
  <br/>
- <img src="https://img.shields.io/badge/Prettier%20-%23F7B93E.svg?&style=for-the-badge&logo=Prettier&logoColor=white"/> 
  <br/>
- <img src="https://img.shields.io/badge/ESLint%20-%234B32C3.svg?&style=for-the-badge&logo=ESLint&logoColor=white"/>
  <br/>
- <img src="https://img.shields.io/badge/Airbnb%20-%23FF5A5F.svg?&style=for-the-badge&logo=Airbnb&logoColor=white"/>

## 🤝 Contributing

Contributions, issues and feature requests are welcome! Just be sure to read the [contributing](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/CONTRIBUTING.md) document to get started. Feel free to check [issues page](https://github.com/stackoutput-com/vite-electron-react-boilerplate/issues).

## 💳 Credits

This project is Inspired by the great work of [Ajay Kanniyappan](https://github.com/AjayKanniyappan/react-electron-template).

## 💖 Show your support

**I hope 🙏 it will helped you! Give a ⭐️ to support this project!**

If you like 💗 the project, there is other way to support us

- Tweet about it
- Refer this project in your project's readme
- Mention the project at local meetups and tell your friends/colleagues

## ☕ Donate

Donations will help us to ensure the following:

- ⚡ Quick responses to issues, bug reports and help requests
- ➕ Adding new features
- ⚒️ Long term maintenance of the project

<a href="https://www.buymeacoffee.com/ajaykanniyappan">
<img height="40" width="150" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png">
</a>

## 🛠️ Author

👨‍💻 **Ajay Kanniyappan**

- Website: https://ajaykanniyappan.com
- Twitter: [@AjayKanniyappan](https://twitter.com/AjayKanniyappan)
- Github: [AjayKanniyappan](https://github.com/AjayKanniyappan)
- LinkedIn: [AjayKanniyappan](https://in.linkedin.com/in/AjayKanniyappan)

## ©️ License

[MIT License](https://github.com/stackoutput-com/vite-electron-react-boilerplate/blob/main/LICENSE) © Ajay Kanniyappan
