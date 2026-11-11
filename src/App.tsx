import { BrowserRouter } from 'react-router-dom';
import { AppProviders } from './contexts/AppProviders';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
      <BrowserRouter>
        <AppProviders>
          <AppRoutes />
        </AppProviders>
      </BrowserRouter>
  );
}

export default App;