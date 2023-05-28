import { useState } from 'react';
import bmc from '@Assets/bmc.png';
import electronLogo from '@Assets/electron.png';
import reactLogo from '@Assets/react.svg';
import viteLogo from '@Assets/vite.svg';
import './OldHome.scss';
import './Api';

function OldHome() {
  const [state, setState] = useState(0);

  return (
    <div>
      <header className="App-Header">
        <a href="https://www.electronjs.org/" target="_blank" rel="noopener noreferrer">
          <img className="App-Logo" src={electronLogo} alt="Electron Logo" />
        </a>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img className="Vite-Logo Vite" src={viteLogo} alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          <img className="App-Logo React" src={reactLogo} alt="React Logo" />
        </a>
      </header>
      <section className="Content">
        <h1>Welcome to</h1>
        <h2>Vite Electron React Boilerplate!</h2>
        <div className="state">
          <button type="button" className="btn" onClick={() => setState((count) => count + 1)}>
            Count is {state}
          </button>
          <p>
            Edit <code>src/renderer/App.tsx</code> and save to test HMR🔥
          </p>
        </div>
        <div className="Link">
          <a
            href="https://github.com/stackoutput-com/vite-electron-react-boilerplate#readme"
            target="_blank"
            rel="noopener noreferrer"
          >
            <button type="button" className="White-Button">
              📖 Read our docs
            </button>
          </a>
          <a href="https://www.buymeacoffee.com/ajaykanniyappan" target="_blank" rel="noreferrer">
            <button type="button" className="Bmc-Button">
              <img className="Bmc-Logo" src={bmc} alt="Buy me a coffee" /> Buy me a coffee
            </button>
          </a>
        </div>
      </section>
      <footer className="footer">
        <a href="https://ajaykanniyappan.com" target="_blank" rel="noopener noreferrer">
          Powered by&nbsp;<span>Ajay Kanniyappan</span>
        </a>
      </footer>
    </div>
  );
}

export default OldHome;