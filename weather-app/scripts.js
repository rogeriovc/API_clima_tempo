// === CONFIG ===
const API_KEY = 'fc7ad3cafd1e1eecd000227f23e31996'; // backup local
const API_URL_CURRENT = 'https://api.openweathermap.org/data/2.5/weather';
const API_URL_FORECAST = 'https://api.openweathermap.org/data/2.5/forecast';
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
  cityInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleSearch() });
});

// === HELPERS: UI ===
function hideAllSections() {
  weatherSection.style.display = 'none';
  errorSection.style.display = 'none';
  loadingSection.style.display = 'none';
}
function showLoading() { hideAllSections(); loadingSection.style.display = 'flex'; }
function showError(message) { hideAllSections(); errorMsg.textContent = message; errorSection.style.display = 'block'; }
function showWeather() { hideAllSections(); weatherSection.style.display = 'block'; }

// === BACKEND FETCH (com fallback) ===
async function fetchWithFallback(url, params = {}) {
  try {
    // tenta PHP backend
    const phpRes = await fetch('./api.php?' + new URLSearchParams({ url }));
    if (phpRes.ok) {
      return await phpRes.json();
    } else {
      throw new Error('Backend não respondeu');
    }
  } catch (err) {
    console.warn('⚠️ Backend falhou, usando chave exposta (somente dev):', err.message);
    // fallback: chama API direto
    const directUrl = url.includes('appid=') ? url : url + `&appid=${API_KEY}`;
    const res = await fetch(directUrl, params);
    if (!res.ok) throw new Error('Erro direto na API: ' + res.status);
    return await res.json();
  }
}

// === SEARCH FLOW ===
async function handleSearch() {
  const city = cityInput.value.trim();
  if (!city) { showError('Por favor, digite o nome de uma cidade.'); return; }
  await searchWeatherByCity(city);
}

async function searchWeatherByCity(city) {
  showLoading();
  try {
    const url = `${API_URL_CURRENT}?q=${encodeURIComponent(city)}&units=metric&lang=pt_br`;
    const data = await fetchWithFallback(url);

    displayWeatherData(data);
    saveToHistory(data.name);
    saveLastSearchedCity(data.name);

    const { lat, lon } = data.coord;
    const forecastUrl = `${API_URL_FORECAST}?lat=${lat}&lon=${lon}&units=metric&lang=pt_br`;
    const forecastData = await fetchWithFallback(forecastUrl);
    displayForecast(forecastData);
  } catch (err) {
    console.error(err);
    showError(err.message || 'Erro desconhecido');
  }
}

// === CURRENT WEATHER DISPLAY ===
function displayWeatherData(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  description.textContent = data.weather[0].description;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${data.wind.speed} m/s`;

  updateWeatherIcon(data.weather[0].icon);
  updateBackgroundTheme(data.weather[0].main.toLowerCase());

  showWeather();
}

// === FORECAST ===
function processForecastData(data) {
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
  const forecast = processForecastData(raw);
  forecastContainer.innerHTML = '';
  if (!forecast || forecast.length === 0) return;
  forecast.forEach(f => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const dateObj = new Date(f.date);
    const dateLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
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
    '01d': 'wi-day-sunny', '01n': 'wi-night-clear', '02d': 'wi-day-cloudy', '02n': 'wi-night-alt-cloudy',
    '03d': 'wi-cloud', '03n': 'wi-cloud', '04d': 'wi-cloudy', '04n': 'wi-cloudy',
    '09d': 'wi-showers', '09n': 'wi-showers', '10d': 'wi-day-rain', '10n': 'wi-night-rain',
    '11d': 'wi-thunderstorm', '11n': 'wi-thunderstorm', '13d': 'wi-snow', '13n': 'wi-snow',
    '50d': 'wi-fog', '50n': 'wi-fog'
  };
  return map[iconCode] || 'wi-na';
}
function updateWeatherIcon(iconCode) { weatherIcon.className = `wi ${mapIcon(iconCode)}`; }

// === BACKGROUND THEME ===
function updateBackgroundTheme(condition) {
  document.body.className = '';
  switch (condition) {
    case 'clear': document.body.classList.add('sunny'); break;
    case 'rain': case 'drizzle': document.body.classList.add('rainy'); break;
    case 'clouds': document.body.classList.add('cloudy'); break;
    case 'snow': document.body.classList.add('snowy'); break;
    default: break;
  }
}

// === GEOLOCATION ===
function getCurrentLocation() {
  if (!navigator.geolocation) { showError('Geolocalização não suportada'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    searchWeatherByCoords(latitude, longitude);
  }, err => {
    console.error(err);
    showError('Permissão de localização negada ou erro ao obter localização.');
  });
}

async function searchWeatherByCoords(lat, lon) {
  showLoading();
  try {
    const url = `${API_URL_CURRENT}?lat=${lat}&lon=${lon}&units=metric&lang=pt_br`;
    const data = await fetchWithFallback(url);

    displayWeatherData(data);
    saveToHistory(data.name);
    saveLastSearchedCity(data.name);

    const forecastUrl = `${API_URL_FORECAST}?lat=${lat}&lon=${lon}&units=metric&lang=pt_br`;
    const forecastData = await fetchWithFallback(forecastUrl);
    displayForecast(forecastData);
  } catch (err) {
    console.error(err); showError(err.message || 'Erro');
  }
}

// === HISTORY ===
function getSearchHistory() { return JSON.parse(localStorage.getItem('weatherHistory') || '[]'); }

function saveToHistory(city) {
  let history = getSearchHistory();
  history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  displaySearchHistory();
}

function removeFromHistory(city) {
  let history = getSearchHistory().filter(h => h.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  displaySearchHistory();
}

function clearHistory() {
  localStorage.removeItem('weatherHistory');
  displaySearchHistory();
}

function displaySearchHistory() {
  const history = getSearchHistory();
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<div style="opacity:.7">Nenhuma pesquisa recente</div>';
    return;
  }
  history.forEach(city => {
    const row = document.createElement('div');
    row.className = 'history-row';
    const btn = document.createElement('button');
    btn.textContent = city;
    btn.style.flex = '1';
    btn.addEventListener('click', () => {
      cityInput.value = city; searchWeatherByCity(city);
    });
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remover';
    removeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeFromHistory(city); });

    row.appendChild(btn); row.appendChild(removeBtn);
    historyList.appendChild(row);
  });
}
function loadSearchHistory() { displaySearchHistory(); }

function saveLastSearchedCity(city) { localStorage.setItem('lastSearchedCity', city); }
function loadLastSearchedCity() {
  const last = localStorage.getItem('lastSearchedCity');
  if (last) cityInput.value = last;
}
