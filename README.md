#  Weather App - API de Clima em Tempo Real

Este é um projeto simples de aplicativo de clima que consome a API [OpenWeatherMap](https://openweathermap.org/) para exibir informações em tempo real sobre a temperatura e as condições climáticas de qualquer cidade do mundo.

---

##  Tecnologias Utilizadas
- HTML5 → Estrutura do app  
- CSS3 → Estilização da interface  
- JavaScript (ES6+) → Consumo da API e lógica do app  
- OpenWeatherMap API → Dados climáticos em tempo real  

---

##  Como Funciona
1. O usuário digita o nome de uma cidade no campo de busca.  
2. O app envia uma requisição para a API do OpenWeatherMap.  
3. Os dados retornados (temperatura, clima, umidade, etc.) são exibidos na tela.  

---

##  Estrutura de Pastas
weather-app/
│── index.html # Estrutura principal
│── style.css # Estilos do app
│── scripts.js # Requisições e lógica JS
└── README.md # Documentação


---

##  Configuração da API
Para rodar este projeto, você precisa de uma chave da [OpenWeatherMap](https://home.openweathermap.org/users/sign_up).

No arquivo `scripts.js`, substitua sua chave no campo:

js
const API_KEY = 'SUA_CHAVE_AQUI';
const API_URL = 'https://api.openweathermap.org/data/2.5/weather';

