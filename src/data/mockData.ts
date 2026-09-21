import { type RiverData } from '../components/RiverCard';
import { type RiverHistoryData } from '../components/RiverChart';
import { type RainGaugeData } from '../components/RainAccumulation';
import { type DailyForecast } from '../components/WeatherForecast';
import { type AlertData } from '../components/ActiveAlerts';

export const cityRivers: RiverData[] = [
    {
        id: '1',
        name: 'Rio Itajaí-Açu',
        capacityPercentage: 57.34,
        currentLevel: 4.85,
        status: 'WARNING',
        location: 'Ponte do Centro',
        lastRead: '2026-09-21T07:15:00-03:00'
    },
    {
        id: '2',
        name: 'Rio Benedito',
        capacityPercentage: 42.57,
        currentLevel: 3.12,
        status: 'NORMAL',
        location: 'Bairro Glória',
        lastRead: '2026-09-21T07:10:00-03:00'
    },
    {
        id: '3',
        name: 'Ribeirão Liberdade',
        capacityPercentage: 0.09,
        currentLevel: 0.45,
        status: 'BELOW',
        location: 'Estação Nova',
        lastRead: '2026-09-21T07:05:00-03:00'
    }
];

export const mockHistoryData: RiverHistoryData[] = [
    {
        riverId: '1',
        riverName: 'Rio Itajaí-Açu (Ponte do Centro)',
        thresholds: { attention: 4.50, warning: 5.50, emergency: 6.50 },
        history: [
            { time: '09:00', level: 4.10 },
            { time: '12:00', level: 4.35 },
            { time: '15:00', level: 4.60 },
            { time: '18:00', level: 4.75 },
            { time: '21:00', level: 4.82 },
            { time: '00:00', level: 4.85 },
            { time: '03:00', level: 4.80 },
            { time: '06:00', level: 4.85 }
        ]
    },
    {
        riverId: '2',
        riverName: 'Rio Benedito (Bairro Glória)',
        thresholds: { attention: 4.00, warning: 5.00, emergency: 6.00 },
        history: [
            { time: '09:00', level: 2.80 },
            { time: '12:00', level: 2.95 },
            { time: '15:00', level: 3.10 },
            { time: '18:00', level: 3.15 },
            { time: '21:00', level: 3.12 },
            { time: '00:00', level: 3.10 },
            { time: '03:00', level: 3.08 },
            { time: '06:00', level: 3.12 }
        ]
    }
];

export const mockRainData: RainGaugeData = {
    stationName: 'Ponte Rio Benedito',
    isRainingNow: false,
    lastUpdated: '07:59',
    maxScale: 50,
    measurements: [
        { periodLabel: '1 H', value: 0.0 },
        { periodLabel: '12 H', value: 0.0 },
        { periodLabel: '24 H', value: 0.0 },
        { periodLabel: '48 H', value: 22.3 }
    ]
};

export const mockForecast: DailyForecast[] = [
    { id: '1', date: '18/09', dayOfWeek: 'Sexta', weatherType: 'SUNNY', minTemp: 15, maxTemp: 25, rainProbability: 0, rainVolume: 0, alertSeverity: 'NORMAL', isPast: true },
    { id: '2', date: '19/09', dayOfWeek: 'Sábado', weatherType: 'PARTLY_CLOUDY', minTemp: 16, maxTemp: 26, rainProbability: 10, rainVolume: 0, alertSeverity: 'NORMAL', isPast: true },
    { id: '3', date: '20/09', dayOfWeek: 'Domingo', weatherType: 'RAINY', minTemp: 18, maxTemp: 23, rainProbability: 80, rainVolume: 12, alertSeverity: 'WATCH', isPast: true },

    { id: '4', date: '21/09', dayOfWeek: 'Segunda', weatherType: 'PARTLY_CLOUDY', minTemp: 18, maxTemp: 26, rainProbability: 10, rainVolume: 0, alertSeverity: 'NORMAL', isToday: true },

    { id: '5', date: '22/09', dayOfWeek: 'Terça', weatherType: 'RAINY', minTemp: 19, maxTemp: 24, rainProbability: 60, rainVolume: 15, alertSeverity: 'WATCH' },
    { id: '6', date: '23/09', dayOfWeek: 'Quarta', weatherType: 'STORMY', minTemp: 17, maxTemp: 22, rainProbability: 95, rainVolume: 45, alertSeverity: 'WARNING' },
    { id: '7', date: '24/09', dayOfWeek: 'Quinta', weatherType: 'STORMY', minTemp: 16, maxTemp: 20, rainProbability: 100, rainVolume: 80, alertSeverity: 'DANGER' },
    { id: '8', date: '25/09', dayOfWeek: 'Sexta', weatherType: 'RAINY', minTemp: 15, maxTemp: 21, rainProbability: 80, rainVolume: 25, alertSeverity: 'WATCH' },
    { id: '9', date: '26/09', dayOfWeek: 'Sábado', weatherType: 'PARTLY_CLOUDY', minTemp: 16, maxTemp: 24, rainProbability: 20, rainVolume: 2, alertSeverity: 'NORMAL' },
    { id: '10', date: '27/09', dayOfWeek: 'Domingo', weatherType: 'SUNNY', minTemp: 17, maxTemp: 27, rainProbability: 0, rainVolume: 0, alertSeverity: 'NORMAL' },
];

export const mockAlerts: AlertData[] = [
    {
        id: '1',
        title: 'Risco de Alagamento na Baixada Central',
        severity: 'WARNING',
        region: 'Centro / Margens do Rio Benedito',
        description: 'O nível do Rio Benedito subiu rapidamente devido ao acúmulo de chuvas nas cabeceiras. Ruas próximas à ponte central podem sofrer interdições.',
        instructions: [
            'Evite transitar com veículos em áreas alagadas.',
            'Mantenha documentos e eletrodomésticos em locais altos se morar perto do rio.',
            'Em caso de emergência, ligue imediatamente para a Defesa Civil (199).'
        ],
        issuedAt: '21/09/2026 às 08:30'
    },
    {
        id: '2',
        title: 'Aviso de Deslizamento em Encostas',
        severity: 'CRITICAL',
        region: 'Morro do Ipiranga e Bairro Nova',
        description: 'Solo encharcado acumulado nas últimas 48 horas apresenta alto risco de movimentação de massa e queda de barreiras.',
        instructions: [
            'Moradores de áreas de encosta devem observar sinais como rachaduras nas paredes ou inclinação de árvores.',
            'Procure abrigo seguro na casa de familiares ou nos abrigos municipais designados.',
            'Deixe a área imediatamente ao menor sinal de instabilidade.'
        ],
        issuedAt: '21/09/2026 às 07:15'
    },
    {
        id: '3',
        title: 'Queda de Barreiras na Rodovia Principal',
        severity: 'WARNING',
        region: 'Acesso Principal - Rodeio / Ascurra',
        description: 'Acumulado de precipitação na semana causou instabilidade no talude, provocando interdição parcial de uma das faixas.',
        instructions: [
            'Reduza a velocidade ao aproximar-se do km 74.',
            'Respeite a sinalização temporária da equipa de trânsito.'
        ],
        issuedAt: '14/09/2026 às 16:45'
    },
    {
        id: '4',
        title: 'Estado de Atenção - Elevação do Nível do Itajaí-Açu',
        severity: 'WATCH',
        region: 'Ponte do Centro e Margens',
        description: 'Chuvas moderadas na região serrana elevaram o caudal do rio acima da cota de segurança secundária.',
        instructions: [
            'Monitorizar o boletim meteorológico periódico.',
            'Evitar atividades de pesca ou lazer nas margens do rio.'
        ],
        issuedAt: '05/09/2026 às 11:20'
    },
    {
        id: '5',
        title: 'Tempestade Severa com Ventos Fortes',
        severity: 'WARNING',
        region: 'Todo o Município de Rodeio - SC',
        description: 'Frente fria associada a rajadas de vento intensas causou queda de ramos e interrupções pontuais no fornecimento de energia elétrica.',
        instructions: [
            'Evite abrigar-se debaixo de árvores durante as rajadas.',
            'Desconecte aparelhos eletrónicos sensíveis das tomadas.',
            'Comunique quedas de fios à concessionária de energia.'
        ],
        issuedAt: '28/08/2026 às 14:10'
    },
    {
        id: '6',
        title: 'Primeira Onda de Frio e Geada Matinal',
        severity: 'WATCH',
        region: 'Áreas Rurais e Altadas',
        description: 'Queda drástica de temperatura durante a madrugada, com risco de formação de geada nas plantações.',
        instructions: [
            'Proteger culturas agrícolas sensíveis.',
            'Atenção redobrada com animais domésticos e abrigos adequados.'
        ],
        issuedAt: '12/08/2026 às 06:00'
    }
];