import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { registerServiceWorker } from './registerSW';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Register PWA Service Worker
registerServiceWorker();

