#  Weather App - Previsão do Tempo em Tempo Real

> Aplicação full-stack que consome a API OpenWeatherMap para fornecer informações climáticas em tempo real com interface responsiva.

---

##  Funcionalidades

-  Busca por cidade ou geolocalização automática
-  Previsão de 5 dias com temperaturas min/max
-  Temas dinâmicos baseados no clima
-  Histórico de pesquisas (LocalStorage)
-  Interface 100% responsiva

---

##  Tecnologias

**Backend:** PHP 8.0+ • cURL • Variáveis de Ambiente (.env)  
**Frontend:** JavaScript ES6+ • CSS3 (Grid/Flexbox) • Weather Icons  
**API:** OpenWeatherMap

---

##  Como Executar

### 1 Clone o repositório
```bash
git clone https://github.com/rogeriovc/API_clima_tempo.git

cd API_clima_tempo
```

### 2 Configure a API Key
Crie um arquivo `.env` na raiz:
```env
OPENWEATHER_API_KEY=sua_chave_aqui
API_URL_CURRENT=https://api.openweathermap.org/data/2.5/weather
API_URL_FORECAST=https://api.openweathermap.org/data/2.5/forecast
DEBUG=false
```

>  Obtenha sua chave gratuita em [OpenWeatherMap](https://home.openweathermap.org/users/sign_up)

### 3 Inicie um servidor local
```bash
php -S localhost:8000
```

### 4 Acesse no navegador
```
http://localhost:8000
```

---

##  Estrutura do Projeto

```
weather-app/
├── api/
│   └── weather.php        # Backend API com validações e segurança
├── index.html             # Interface principal
├── style.css              # Estilos responsivos + temas dinâmicos
├── scripts.js             # Lógica cliente + consumo da API
├── .env                   # Variáveis de ambiente (não versionado)
├── .gitignore             # Arquivos ignorados pelo Git
└── README.md              # Documentação
```

---

##  Diferenciais Técnicos

-  Arquitetura backend/frontend separada (API RESTful)
-  Segurança com variáveis de ambiente (.env)
-  Validação server-side e client-side
-  Tratamento robusto de erros e timeouts
-  Sistema de logging com mascaramento de chaves
-  Código limpo e documentado

---

##  Desenvolvedor

Desenvolvido por **Rogério Vicente**

[GitHub](https://github.com/rogeriovc) • [Repositório do Projeto](https://github.com/rogeriovc/API_clima_tempo) 
• [LinkedIn] (https://www.linkedin.com/in/rog%C3%A9rio-vicente-de-c-laporta-836662382/)

---
 Se este projeto te ajudou, deixe uma estrela.