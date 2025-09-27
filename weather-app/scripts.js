// === CONFIG ===
const API_ENDPOINT = './api/weather.php';
const MAX_HISTORY = 5;

// === DOM ===
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const weatherSection = document.getElementById('weatherSection');
const errorSection = document.getElementById('errorSection');
const loadingSection = document.getElementById('loadingSection');
const historyList = document.getElementById('historyList');
const forecastContainer = document.getElementById('forecastContainer');

const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const weatherIcon = document.getElementById('weatherIcon');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const errorMsg = document.getElementById('errorMsg');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
  loadSearchHistory();
  loadLastSearchedCity();
  
  searchBtn.addEventListener('click', handleSearch);
  locationBtn.addEventListener('click', getCurrentLocation);
  clearHistoryBtn.addEventListener('click', clearHistory);
  cityInput.addEventListener('keypress', e => { 
    if (e.key === 'Enter') handleSearch() 
  });
  
  console.log(' App inicializado com sucesso!');
});

// === HELPERS: UI ===
function hideAllSections() {
  weatherSection.style.display = 'none';
  errorSection.style.display = 'none';
  loadingSection.style.display = 'none';
}

function showLoading() { 
  hideAllSections(); 
  loadingSection.style.display = 'flex'; 
  console.log(' Mostrando loading...');
}

function showError(message) { 
  hideAllSections(); 
  errorMsg.textContent = message; 
  errorSection.style.display = 'block'; 
  console.error(' Erro:', message);
}

function showWeather() { 
  hideAllSections(); 
  weatherSection.style.display = 'block'; 
  console.log(' Mostrando clima...');
}

// === API CALLS (CORRIGIDO) ===
async function makeSecureApiCall(action, params = {}) {
  try {
    const requestData = { action, ...params };
    console.log(' Enviando requisição:', requestData);
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    console.log(' Status da resposta:', response.status);
    console.log(' Response OK:', response.ok);

    // CORREÇÃO: Não verificar apenas response.ok
    // Vamos ler a resposta primeiro
    const responseText = await response.text();
    console.log(' Resposta bruta:', responseText.substring(0, 200) + '...');

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(' Erro ao fazer parse do JSON:', parseError);
      console.error(' Resposta completa:', responseText);
      throw new Error('Resposta inválida do servidor (não é JSON válido)');
    }

    console.log(' Resposta processada:', result);
    
    // Verificar se o backend retornou erro
    if (!result.success) {
      throw new Error(result.message || 'Erro desconhecido do servidor');
    }
    
    return result.data;
    
  } catch (error) {
    console.error(' Erro na API:', error);
    
    // Tratamento de erros mais específico
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Erro de conexão. Verifique se o servidor está funcionando.');
    }
    
    throw error;
  }
}

// === SEARCH FLOW ===
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) { 
    showError('Por favor, digite o nome de uma cidade.'); 
    return; 
  }
  console.log(' Iniciando busca por:', city);
  await searchWeatherByCity(city);
}

async function searchWeatherByCity(city) {
  showLoading();
  try {
    console.log(' Buscando clima para:', city);
    
    // Busca clima atual
    const weatherData = await makeSecureApiCall('current', { city });
    console.log(' Dados do clima recebidos:', weatherData);
    
    displayWeatherData(weatherData);
    saveToHistory(weatherData.name);
    saveLastSearchedCity(weatherData.name);

    // Busca previsão usando coordenadas do resultado atual
    const { lat, lon } = weatherData.coord;
    console.log(' Buscando previsão para:', lat, lon);
    
    const forecastData = await makeSecureApiCall('forecast', { lat, lon });
    console.log(' Dados de previsão recebidos:', forecastData);
    
    displayForecast(forecastData);
    
  } catch (err) {
    console.error(' Erro na busca:', err);
    
    // Tratamento de erros melhorado
    let errorMessage = err.message;
    
    if (errorMessage.includes('404') || errorMessage.includes('não encontrada')) {
      errorMessage = 'Cidade não encontrada. Verifique a grafia e tente novamente.';
    } else if (errorMessage.includes('429')) {
      errorMessage = 'Muitas requisições. Aguarde um momento e tente novamente.';
    } else if (errorMessage.includes('503')) {
      errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.';
    } else if (errorMessage.includes('conexão')) {
      errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    showError(errorMessage);
  }
}

// === GEOLOCATION ===
function getCurrentLocation() {
  if (!navigator.geolocation) { 
    showError('Geolocalização não suportada pelo seu navegador'); 
    return; 
  }
  
  showLoading();
  console.log(' Obtendo localização...');
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      console.log(' Localização obtida:', latitude, longitude);
      searchWeatherByCoords(latitude, longitude);
    },
    (error) => {
      console.error(' Erro de geolocalização:', error);
      let message = 'Erro ao obter localização';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Permissão de localização negada. Conceda acesso para usar esta função.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Localização indisponível. Tente novamente mais tarde.';
          break;
        case error.TIMEOUT:
          message = 'Timeout na obtenção da localização. Tente novamente.';
          break;
      }
      
      showError(message);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

async function searchWeatherByCoords(lat, lon) {
  showLoading();
  try {
    console.log(' Buscando clima por coordenadas:', lat, lon);
    
    // Busca clima atual por coordenadas
    const weatherData = await makeSecureApiCall('current', { lat, lon });
    
    displayWeatherData(weatherData);
    saveToHistory(weatherData.name);
    saveLastSearchedCity(weatherData.name);

    // Busca previsão
    const forecastData = await makeSecureApiCall('forecast', { lat, lon });
    displayForecast(forecastData);
    
  } catch (err) {
    console.error(' Erro na busca por coordenadas:', err);
    showError(err.message || 'Erro ao buscar dados meteorológicos');
  }
}

// === CURRENT WEATHER DISPLAY ===
function displayWeatherData(data) {
  console.log(' Exibindo dados do clima:', data);
  
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  description.textContent = data.weather[0].description;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${data.wind?.speed || 0} m/s`;

  updateWeatherIcon(data.weather[0].icon);
  updateBackgroundTheme(data.weather[0].main.toLowerCase());

  showWeather();
}

// === FORECAST ===
function processForecastData(data) {
  console.log(' Processando dados de previsão...');
  
  const days = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().split('T')[0];
    if (!days[day]) days[day] = [];
    days[day].push(item);
  });

  const today = new Date().toISOString().split('T')[0];
  const dayKeys = Object.keys(days).filter(k => k > today).slice(0, 5);

  return dayKeys.map(key => {
    const items = days[key];
    let target = items.reduce((acc, cur) => {
      const diffCur = Math.abs(new Date(cur.dt * 1000).getHours() - 12);
      const diffAcc = Math.abs(new Date(acc.dt * 1000).getHours() - 12);
      return diffCur < diffAcc ? cur : acc;
    }, items[0]);
    
    const tempMin = Math.round(Math.min(...items.map(i => i.main.temp_min)));
    const tempMax = Math.round(Math.max(...items.map(i => i.main.temp_max)));
    
    return {
      date: key,
      icon: target.weather[0].icon,
      description: target.weather[0].description,
      temp: Math.round(target.main.temp),
      tempMin,
      tempMax
    };
  });
}

function displayForecast(raw) {
  console.log(' Exibindo previsão...');
  
  const forecast = processForecastData(raw);
  forecastContainer.innerHTML = '';
  
  if (!forecast || forecast.length === 0) {
    forecastContainer.innerHTML = '<p style="text-align:center;opacity:0.7">Previsão indisponível</p>';
    return;
  }
  
  forecast.forEach(f => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const dateObj = new Date(f.date);
    const dateLabel = dateObj.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    
    card.innerHTML = `
      <div class="date">${dateLabel}</div>
      <div class="icon"><i class="wi ${mapIcon(f.icon)}" style="font-size:1.4rem"></i></div>
      <div class="desc" style="text-transform:capitalize">${f.description}</div>
      <div class="temp">${f.temp}°</div>
      <div style="font-size:0.85rem;opacity:0.9">min ${f.tempMin}° / max ${f.tempMax}°</div>
    `;
    forecastContainer.appendChild(card);
  });
}

// === ICON MAPPING ===
function mapIcon(iconCode) {
  const map = {
    '01d': 'wi-day-sunny', '01n': 'wi-night-clear', 
    '02d': 'wi-day-cloudy', '02n': 'wi-night-alt-cloudy',
    '03d': 'wi-cloud', '03n': 'wi-cloud', 
    '04d': 'wi-cloudy', '04n': 'wi-cloudy',
    '09d': 'wi-showers', '09n': 'wi-showers', 
    '10d': 'wi-day-rain', '10n': 'wi-night-rain',
    '11d': 'wi-thunderstorm', '11n': 'wi-thunderstorm',
    '13d': 'wi-snow', '13n': 'wi-snow',
    '50d': 'wi-fog', '50n': 'wi-fog'
  };
  return map[iconCode] || 'wi-na';
}

function updateWeatherIcon(iconCode) { 
  weatherIcon.className = `wi ${mapIcon(iconCode)}`; 
}

// === BACKGROUND THEME ===
function updateBackgroundTheme(condition) {
  document.body.className = '';
  switch (condition) {
    case 'clear': 
      document.body.classList.add('sunny'); 
      break;
    case 'rain': 
    case 'drizzle': 
      document.body.classList.add('rainy'); 
      break;
    case 'clouds': 
      document.body.classList.add('cloudy'); 
      break;
    case 'snow': 
      document.body.classList.add('snowy'); 
      break;
    case 'thunderstorm':
      document.body.classList.add('stormy'); 
      break;
    case 'mist':
    case 'fog':
    case 'haze':
      document.body.classList.add('foggy'); 
      break;
    default: 
      break;
  }
}

// === HISTORY MANAGEMENT ===
function getSearchHistory() { 
  try {
    return JSON.parse(localStorage.getItem('weatherHistory') || '[]'); 
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
    return [];
  }
}

function saveToHistory(city) {
  try {
    let history = getSearchHistory();
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
    history.unshift(city);
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    displaySearchHistory();
  } catch (e) {
    console.warn('Erro ao salvar histórico:', e);
  }
}

function removeFromHistory(city) {
  try {
    let history = getSearchHistory().filter(h => h.toLowerCase() !== city.toLowerCase());
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    displaySearchHistory();
  } catch (e) {
    console.warn('Erro ao remover do histórico:', e);
  }
}

function clearHistory() {
  try {
    localStorage.removeItem('weatherHistory');
    displaySearchHistory();
  } catch (e) {
    console.warn('Erro ao limpar histórico:', e);
  }
}

function displaySearchHistory() {
  const history = getSearchHistory();
  historyList.innerHTML = '';
  
  if (history.length === 0) {
    historyList.innerHTML = '<div style="opacity:.7;text-align:center;padding:10px">Nenhuma pesquisa recente</div>';
    return;
  }
  
  history.forEach(city => {
    const row = document.createElement('div');
    row.className = 'history-row';
    
    const btn = document.createElement('button');
    btn.textContent = city;
    btn.style.flex = '1';
    btn.style.textAlign = 'left';
    btn.addEventListener('click', () => {
      cityInput.value = city; 
      searchWeatherByCity(city);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remover';
    removeBtn.style.minWidth = '24px';
    removeBtn.addEventListener('click', (e) => { 
      e.stopPropagation(); 
      removeFromHistory(city); 
    });

    row.appendChild(btn); 
    row.appendChild(removeBtn);
    historyList.appendChild(row);
  });
}

function loadSearchHistory() { 
  displaySearchHistory(); 
}

function saveLastSearchedCity(city) { 
  try {
    localStorage.setItem('lastSearchedCity', city); 
  } catch (e) {
    console.warn('Erro ao salvar última cidade:', e);
  }
}

function loadLastSearchedCity() {
  try {
    const last = localStorage.getItem('lastSearchedCity');
    if (last) {
      cityInput.value = last;
    }
  } catch (e) {
    console.warn('Erro ao carregar última cidade:', e);
  }
}

// === ERROR HANDLING GLOBAL ===
window.addEventListener('error', (event) => {
  console.error(' Erro global capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error(' Promise rejeitada:', event.reason);
  event.preventDefault();
});