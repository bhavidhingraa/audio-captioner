import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent circular JSON errors when libraries log DOM elements
const overrideConsole = (method: 'log' | 'warn' | 'error' | 'info') => {
  const original = console[method];
  console[method] = (...args: any[]) => {
    const safeArgs = args.map(arg => {
      if (arg && typeof arg === 'object') {
        if (arg instanceof Element || arg instanceof Node) {
          return `<${arg.nodeName.toLowerCase()} />`;
        }
        // Attempt to catch React synthetic events or objects with fiber nodes
        if ('_reactName' in arg || '__reactFiber$' in arg) {
          return '[React Event/Fiber]';
        }
      }
      return arg;
    });
    original(...safeArgs);
  };
};

overrideConsole('log');
overrideConsole('warn');
overrideConsole('error');
overrideConsole('info');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
