# HydroGuard Front-end — Plataforma Web de Monitoramento e Alertas da Defesa Civil

Interface web responsiva desenvolvida em **React 19**, **TypeScript** e **Vite** para visualização pública de níveis de rios, acumulados de chuva, previsão meteorológica, mapas de áreas de risco e gestão operacional de alertas da Defesa Civil em municípios de Santa Catarina.

---

## 1. Transparência de Dados: O Que é Real, Simulado e Planejado

Em conformidade com as diretrizes de engenharia do projeto, todas as telas identificam explicitamente a origem, a unidade de medida e o instante de atualização de cada informação:

| Módulo / Funcionalidade | Classificação | Fonte / Método Utilizado | Identificação na Interface |
| :--- | :--- | :--- | :--- |
| **Nível dos Rios, Vazão e Gráficos de 24h** | **Dado Externo Real** | API HidroWeb da Agência Nacional de Águas (**ANA**) via Back-end | Exibe código da estação (`ANA #código`), unidade (`m`, `m³/s`), horário da medição e selo **`Desatualizado`** se a leitura tiver > 3h. |
| **Chuva Acumulada (Provetas 1h a 24h)** | **Dado Externo Real** | API HidroWeb da **ANA** via Back-end | Exibe nome/código do pluviômetro, escala em `mm` e horário da última leitura. |
| **Previsão e Histórico Meteorológico (10 dias)** | **Dado Externo Real** | **Open-Meteo Forecast API** (Modelos GFS/ECMWF) | Exibe fonte no cabeçalho e unidades (`°C` e `mm`). |
| **Radar Meteorológico Interativo** | **Dado Externo Real** | **Windy Embed API** (Modelo ECMWF) | Camada de radar ao vivo centrada nas coordenadas do município. |
| **Malha Municipal de Santa Catarina (295 cidades)** | **Dado Externo Real** | **API de Malhas Geográficas v3 do IBGE** | Polígonos oficiais com cache no navegador (*Cache Storage API*). |
| **Alertas Oficiais e Áreas de Risco** | **Persistência Própria** | Banco **PostgreSQL (Supabase)** via API Spring Boot | Exibe órgão emissor (`Origem`), horário de emissão, última atualização, prazo de validade, área afetada e histórico consultável. |
| **Simulador de Cota e Vias Atingidas** | **Simulação Topográfica Ilustrativa** | Modelo hidrostático **HAND** sobre relevo satelital **AWS Terrarium DEM (SRTM ~30m)** e vetores **OpenStreetMap (Overpass API)** | Exibe aviso amarelo fixo no topo do simulador: *"SIMULAÇÃO TOPOGRÁFICA ILUSTRATIVA — Não constitui previsão hidrológica oficial validada"*. |
| **Integração INMET/CEMADEN e Disparo SMS** | **Backlog (Planejado)** | Fora do escopo do MVP atual | Previsto para evolução futura após validação do fluxo base. |

---

## 2. Tratamento de Indisponibilidade, Acessibilidade e Navegação Mobile

1. **Prevenção de Falso Status "Normal":**
    * Quando a API da ANA não retorna leituras válidas (`rivers.length === 0`), o status global da cidade no cabeçalho muda imediatamente para **`DADO INDISPONÍVEL`** (badge cinza neutro) e o Dashboard exibe um painel de alerta (`role="alert"`) informando a falha da fonte externa, sem jamais exibir valores simulados no painel de telemetria.
2. **Detecção de Leituras Defasadas (`> 3 horas`):**
    * O mapeador calcula a idade de cada medição (`readingAgeMinutes`). Leituras com mais de 180 minutos recebem o selo visual e textual **`Desatualizado`**.
3. **Informação Textual Independente de Cor ou Mapa:**
    * Todos os estados de severidade possuem rótulos textuais explícitos (`Normal`, `Atenção`, `Alerta`, `Crítico / Emergência`, `Dado Indisponível`, `Encerrado pelo Operador`, `Prazo Expirado`).
    * Os alertas ativos aparecem simultaneamente em texto estruturado no topo do **Dashboard**, na **Central de Alertas** (com botão de cópia de boletim em texto puro) e demarcados no **Mapa de Perigo**.
4. **Responsividade Mobile (`< 768px`):**
    * Em dispositivos móveis, a barra lateral transforma-se em uma **Topbar compacta** acompanhada de um **Off-Canvas Drawer** acessível por teclado (`Esc` para fechar, `aria-expanded`, bloqueio de scroll de fundo e fechamento automático ao navegar).

---

## 3. Configuração e Execução Local

### 3.1. Pré-requisitos
* **Node.js** 20+ e **npm**
* Back-end (`hydro-guard-backend`) em execução na porta `8080`

### 3.2. Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env.local` na raiz do projeto:
```dotenv
VITE_API_URL=http://localhost:8080/api/v1
```

### 3.3. Instalar e Executar
```bash
npm install
npm run dev
```
Acesse a aplicação em `http://localhost:5173`.

---

## 4. Credencial Fictícia de Demonstração (CP3)

Para testar os fluxos restritos de operador na demonstração acadêmica (acessando a rota `/rodeio` e clicando em **Área do Coordenador** na barra lateral):
* **E-mail:** `operador.demo@hydroguard.sc`
* **Palavra-passe:** `123456`

---

## 5. Roteiro de Testes Manuais Reproduzíveis (Checklist CP3)

| ID | Cenário de Teste | Entrada / Ação Reproduzível | Resultado Esperado | Resultado Observado |
| :--- | :--- | :--- | :--- | :--- |
| **CT-01** | **Publicação de Alerta com Origem e Validade** | 1. Acessar `/rodeio` e autenticar com `operador.demo@hydroguard.sc` (`123456`).<br>2. Ir em **Alertas** $\rightarrow$ **Novo Alerta**.<br>3. Preencher título *"Elevação Rápida do Rio Benedito"*, gravidade *Alerta (Laranja)*, validade *12 horas*, região *"Centro"*, origem *"Defesa Civil de Rodeio"* e publicar. | O alerta é salvo no PostgreSQL (`201 Created`), aparece na aba **Alertas Ativos**, exibe banner de destaque no topo do **Dashboard**, plota círculo tracejado no **Mapa de Perigo** e atualiza o Status da Cidade no cabeçalho. | **Aprovado.** Persistência confirmada no banco e sincronizada entre sessões públicas e autenticadas. |
| **CT-02** | **Encerramento de Alerta e Consulta no Histórico** | 1. Na aba **Alertas Ativos**, clicar em **Encerrar Alerta** no card recém-criado.<br>2. Alternar para a aba **Histórico**. | O alerta deixa de aparecer como ativo no Dashboard e na aba pública principal, e passa a constar na aba **Histórico** com o selo `ENCERRADO PELO OPERADOR` e horário de encerramento preenchido. | **Aprovado.** Ciclo de vida (`ACTIVE` $\rightarrow$ `CLOSED`) preservado para consulta histórica. |
| **CT-03** | **Bloqueio de Acesso Não Autorizado e Posse de Dados entre Municípios** | 1. Como visitante anônimo, verificar ausência dos botões *Novo Alerta*, *Encerrar Alerta* e *Nova Área de Risco*.<br>2. Tentar autenticar a conta de `rodeio` enquanto navega no painel de `/blumenau` (ou enviar `PATCH /api/v1/alerts/{id}/deactivate` com token de outra cidade). | O front-end rejeita o login cruzado informando a qual município a conta pertence, e o back-end bloqueia qualquer mutação cruzada com `403 Forbidden`. | **Aprovado.** Isolamento por município validado no cliente e no servidor. |
| **CT-04** | **Falha da Fonte Externa de Leituras (`Dado Indisponível`)** | 1. Autenticado como coordenador em `/rodeio`, localizar o card **Diagnóstico de Rede** na barra lateral.<br>2. Clicar em **Simular Falha da ANA**.<br>3. Observar o cabeçalho e o Dashboard.<br>4. Clicar em **Restaurar Conexão ANA**. | Ao ativar a falha: API da ANA muda para `Offline`, o Status da Cidade muda para **`DADO INDISPONÍVEL`** (cinza) e o Dashboard exibe o aviso de indisponibilidade sem forjar status "Normal". Ao restaurar, as leituras reais retornam imediatamente. | **Aprovado.** Falha externa tratada com transparência sem mascaramento. |
| **CT-05** | **Navegação Responsiva em Celular (Drawer Mobile)** | 1. Redimensionar a janela do navegador para largura mobile (`375x812 px`).<br>2. Tocar no botão de menu (`☰`) na barra superior, navegar entre **Dashboard**, **Mapas de Perigo** e **Alertas** e pressionar `Esc` ou tocar fora. | A barra superior permanece compacta, a gaveta lateral (*Off-Canvas Drawer*) abre sobre o conteúdo com *backdrop* e fecha automaticamente ao selecionar uma rota. | **Aprovado.** Navegação fluida em telas pequenas sem empurrar o conteúdo principal para baixo. |