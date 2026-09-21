import './App.css';
import { RiverCard } from './components/RiverCard';
import cityBanner from './assets/banner-rodeio.png';
import { RiverChart } from "./components/RiverChart.tsx";
import { Footer } from "./components/Footer.tsx";
import { Sidebar } from './components/Sidebar';
import { RainAccumulation } from "./components/RainAccumulation.tsx";
import { WeatherForecast } from "./components/WeatherForecast.tsx";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WindyMap } from './components/WindyMap';
import { FloodMap } from "./components/FloodMap.tsx";
import { ActiveAlerts, type AlertData } from './components/ActiveAlerts';

import {
  cityRivers,
  mockHistoryData,
  mockRainData,
  mockForecast,
  mockAlerts as initialAlerts
} from './data/mockData';
import {useState} from "react";

function App() {

  const [alerts, setAlerts] = useState<AlertData[]>(initialAlerts);

  const handleAddAlert = (newAlertData: Omit<AlertData, 'id' | 'issuedAt'>) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    const newAlert: AlertData = {
      id: String(Date.now()),
      ...newAlertData,
      issuedAt: formattedDate
    };

    setAlerts([newAlert, ...alerts]);
  };


  return (
      <BrowserRouter>
        <div className="app-container">
          <Sidebar />

          <main className="main-content">
            { }
            <header
                className="page-header"
                style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.9)), url(${cityBanner})` }}
            >
              <div className="header-titles">
                <h1>Painel de Monitorização</h1>
                <p className="subtitle">Rodeio - SC</p>
              </div>
              <div className="global-status">
                <span>Status da Cidade:</span>
                <span className="badge-normal">Normal</span>
              </div>
            </header>

            { }
            <Routes>
              { }
              <Route path="/" element={
                <>
                  <section aria-labelledby="section-rios">
                    <h2 id="section-rios" className="section-title">Nível dos Rios em Tempo Real</h2>
                    <div className="cards-grid">
                      {cityRivers.map((river) => (
                          <RiverCard key={river.id} data={river} />
                      ))}
                    </div>
                  </section>
                  <RiverChart data={mockHistoryData} />
                  <div style={{ marginTop: '2rem' }}>
                    <RainAccumulation data={mockRainData} />
                  </div>
                </>
              } />

              <Route path="/weather" element={
                <>
                  <WeatherForecast forecastData={mockForecast} />
                  <WindyMap />
                </>
              } />

              <Route path="/maps" element={
                <FloodMap />
              } />

              <Route path="/alerts" element={
                <ActiveAlerts alerts={alerts} onAddAlert={handleAddAlert} />
              } />

            </Routes>

            <Footer />
          </main>
        </div>
      </BrowserRouter>
  );
}

export default App;