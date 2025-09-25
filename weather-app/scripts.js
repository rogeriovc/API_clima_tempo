// === CONFIG ===
const API_KEY = 'fc7ad3cafd1e1eecd000227f23e31996'; // sua chave (local dev ok)
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
function hideAllSections(){
  weatherSection.style.display = 'none';
  errorSection.style.display = 'none';
  loadingSection.style.display = 'none';
}
function showLoading(){ hideAllSections(); loadingSection.style.display = 'flex'; }
function showError(message){ hideAllSections(); errorMsg.textContent = message; errorSection.style.display = 'block'; }
function showWeather(){ hideAllSections(); weatherSection.style.display = 'block'; }

// === SEARCH FLOW ===
async function handleSearch(){
  const city = cityInput.value.trim();
  if (!city){ showError('Por favor, digite o nome de uma cidade.'); return; }
  await searchWeatherByCity(city);
}

async function searchWeatherByCity(city){
  showLoading();
  try {
    const url = `${API_URL_CURRENT}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=pt_br`;
    const res = await fetch(url);
    if (!res.ok){
      if (res.status === 404) throw new Error('Cidade não encontrada');
      throw new Error('Erro ao buscar dados do clima');
    }
    const data = await res.json();
    displayWeatherData(data);
    saveToHistory(data.name);
    saveLastSearchedCity(data.name);

    // pegar previsão (usa lat/lon)
    const { lat, lon } = data.coord;
    const forecastData = await fetchForecast(lat, lon);
    displayForecast(forecastData);
  } catch(err){
    console.error(err);
    showError(err.message || 'Erro desconhecido');
  }
}

// === CURRENT WEATHER DISPLAY ===
function displayWeatherData(data){
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

// === FORECAST (usa /forecast) ===
async function fetchForecast(lat, lon){
  const url = `${API_URL_FORECAST}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar previsão');
  const data = await res.json();
  // agrupa por dia
  const days = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toISOString().split('T')[0];
    if (!days[day]) days[day] = [];
    days[day].push(item);
  });
  // pega próximas 5 datas (exclui hoje)
  const today = new Date().toISOString().split('T')[0];
  const dayKeys = Object.keys(days).filter(k => k > today).slice(0, 5);
  // construir array com resumo
  const forecast = dayKeys.map(key => {
    const items = days[key];
    // item mais próximo de 12:00
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
  return forecast;
}

function displayForecast(forecast){
  forecastContainer.innerHTML = '';
  if (!forecast || forecast.length === 0) return;
  forecast.forEach(f => {
    const card = document.createElement('div');
    card.className = 'forecast-card';
    const dateObj = new Date(f.date);
    const dateLabel = dateObj.toLocaleDateString('pt-BR', {weekday:'short', day:'numeric', month:'short'});
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
function mapIcon(iconCode){
  const map = {
    '01d':'wi-day-sunny','01n':'wi-night-clear','02d':'wi-day-cloudy','02n':'wi-night-alt-cloudy',
    '03d':'wi-cloud','03n':'wi-cloud','04d':'wi-cloudy','04n':'wi-cloudy',
    '09d':'wi-showers','09n':'wi-showers','10d':'wi-day-rain','10n':'wi-night-rain',
    '11d':'wi-thunderstorm','11n':'wi-thunderstorm','13d':'wi-snow','13n':'wi-snow',
    '50d':'wi-fog','50n':'wi-fog'
  };
  return map[iconCode] || 'wi-na';
}
function updateWeatherIcon(iconCode){
  weatherIcon.className = `wi ${mapIcon(iconCode)}`;
}

// === BACKGROUND THEME (simples) ===
function updateBackgroundTheme(condition){
  document.body.className = '';
  switch(condition){
    case 'clear': document.body.classList.add('sunny'); break;
    case 'rain': case 'drizzle': document.body.classList.add('rainy'); break;
    case 'clouds': document.body.classList.add('cloudy'); break;
    case 'snow': document.body.classList.add('snowy'); break;
    default: /* mantém */ break;
  }
}

// === GEOLOCATION ===
function getCurrentLocation(){
  if (!navigator.geolocation){ showError('Geolocalização não suportada'); return; }
  showLoading();
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    searchWeatherByCoords(latitude, longitude);
  }, err => {
    console.error(err);
    showError('Permissão de localização negada ou erro ao obter localização.');
  });
}

async function searchWeatherByCoords(lat, lon){
  showLoading();
  try {
    const url = `${API_URL_CURRENT}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=pt_br`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar clima por coordenadas');
    const data = await res.json();
    displayWeatherData(data);
    saveToHistory(data.name);
    saveLastSearchedCity(data.name);

    // forecast
    const forecastData = await fetchForecast(lat, lon);
    displayForecast(forecastData);
  } catch(err){
    console.error(err); showError(err.message || 'Erro');
  }
}

// === HISTORY ===
function getSearchHistory(){ return JSON.parse(localStorage.getItem('weatherHistory') || '[]'); }

function saveToHistory(city){
  let history = getSearchHistory();
  history = history.filter(item => item.toLowerCase() !== city.toLowerCase());
  history.unshift(city);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  displaySearchHistory();
}

function removeFromHistory(city){
  let history = getSearchHistory().filter(h => h.toLowerCase() !== city.toLowerCase());
  localStorage.setItem('weatherHistory', JSON.stringify(history));
  displaySearchHistory();
}

function clearHistory(){
  localStorage.removeItem('weatherHistory');
  displaySearchHistory();
}

function displaySearchHistory(){
  const history = getSearchHistory();
  historyList.innerHTML = '';
  if (history.length === 0){
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
function loadSearchHistory(){ displaySearchHistory(); }

function saveLastSearchedCity(city){ localStorage.setItem('lastSearchedCity', city); }
function loadLastSearchedCity(){
  const last = localStorage.getItem('lastSearchedCity');
  if (last) cityInput.value = last;
}
