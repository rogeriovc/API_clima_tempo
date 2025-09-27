<?php

// Carrega variáveis de ambiente
function loadEnv($path) {
    if (!file_exists($path)) {
        throw new Exception('.env file not found');
    }
    
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue; // Skip comments
        
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Carrega .env
try {
    loadEnv(__DIR__ . '/../.env');
} catch (Exception $e) {
    error_log('Erro ao carregar .env: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Configuração do servidor não encontrada']);
    exit();
}

// Configurações de CORS e Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== CONFIGURAÇÕES =====
$API_KEY = getenv('OPENWEATHER_API_KEY');
$API_URL_CURRENT = getenv('API_URL_CURRENT') ?: 'https://api.openweathermap.org/data/2.5/weather';
$API_URL_FORECAST = getenv('API_URL_FORECAST') ?: 'https://api.openweathermap.org/data/2.5/forecast';
$TIMEOUT = (int)getenv('SERVER_TIMEOUT') ?: 30;
$CONNECT_TIMEOUT = (int)getenv('SERVER_CONNECT_TIMEOUT') ?: 10;
$DEBUG = getenv('DEBUG') === 'true';

/**
 * Enviar resposta JSON padronizada
 */
function sendResponse($success, $data = null, $message = '', $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

/**
 * Log de erros personalizados
 */
function logError($message, $context = []) {
    global $DEBUG;
    
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    
    if (!empty($context)) {
        $logEntry .= " | Context: " . json_encode($context);
    }
    
    if ($DEBUG) {
        error_log($logEntry);
    }
}

/**
 * Validar parâmetros de entrada
 */
function validateInput($data, $action) {
    switch ($action) {
        case 'current':
            if (!isset($data['city']) && (!isset($data['lat']) || !isset($data['lon']))) {
                return 'Parâmetros insuficientes: informe "city" OU "lat" e "lon"';
            }
            
            // Validar coordenadas se fornecidas
            if (isset($data['lat']) && isset($data['lon'])) {
                if (!is_numeric($data['lat']) || !is_numeric($data['lon'])) {
                    return 'Coordenadas inválidas: lat e lon devem ser números';
                }
                if ($data['lat'] < -90 || $data['lat'] > 90) {
                    return 'Latitude inválida: deve estar entre -90 e 90';
                }
                if ($data['lon'] < -180 || $data['lon'] > 180) {
                    return 'Longitude inválida: deve estar entre -180 e 180';
                }
            }
            break;
            
        case 'forecast':
            if (!isset($data['lat']) || !isset($data['lon'])) {
                return 'Parâmetros obrigatórios: "lat" e "lon"';
            }
            if (!is_numeric($data['lat']) || !is_numeric($data['lon'])) {
                return 'Coordenadas inválidas: lat e lon devem ser números';
            }
            break;
            
        default:
            return 'Ação não suportada';
    }
    
    return null; // Sem erros
}

/**
 * Fazer requisição HTTP usando cURL
 */
function makeApiRequest($url) {
    global $TIMEOUT, $CONNECT_TIMEOUT;
    
    $ch = curl_init();
    
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => $TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => $CONNECT_TIMEOUT,
        CURLOPT_USERAGENT => 'WeatherApp-PHP/2.0 (Secure Version)',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_ENCODING => 'gzip, deflate',
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    $info = curl_getinfo($ch);
    
    curl_close($ch);
    
    // Log detalhes da requisição para debug
    logError("API Request", [
        'url' => preg_replace('/appid=[^&]+/', 'appid=***', $url), // Mascarar API key nos logs
        'http_code' => $httpCode,
        'total_time' => $info['total_time'] ?? 0,
        'error' => $error
    ]);
    
    if ($error) {
        logError("cURL Error: $error");
        return false;
    }
    
    if ($httpCode >= 400) {
        logError("HTTP Error: $httpCode");
        return false;
    }
    
    return $response;
}

// ===== VALIDAÇÕES INICIAIS =====

// Verificar se é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, null, 'Método não permitido. Use POST.', 405);
}

// Verificar se API key está configurada
if (empty($API_KEY) || $API_KEY === 'SUA_CHAVE_AQUI') {
    logError("API Key não configurada");
    sendResponse(false, null, 'Erro de configuração do servidor', 500);
}

// Ler dados JSON do body
$input = file_get_contents('php://input');
if (empty($input)) {
    sendResponse(false, null, 'Body da requisição vazio', 400);
}

$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    sendResponse(false, null, 'JSON inválido: ' . json_last_error_msg(), 400);
}

if (!isset($data['action'])) {
    sendResponse(false, null, 'Parâmetro "action" obrigatório', 400);
}

$action = $data['action'];

// Validar entrada
$validationError = validateInput($data, $action);
if ($validationError) {
    sendResponse(false, null, $validationError, 400);
}

// ===== PROCESSAMENTO PRINCIPAL =====

try {
    switch ($action) {
        case 'current':
            handleCurrentWeather($data);
            break;
            
        case 'forecast':
            handleForecast($data);
            break;
            
        default:
            sendResponse(false, null, "Ação '$action' não suportada", 400);
    }
} catch (Exception $e) {
    logError("Exception: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
    sendResponse(false, null, 'Erro interno do servidor', 500);
}

// ===== HANDLERS DAS AÇÕES =====

/**
 * Buscar clima atual
 */
function handleCurrentWeather($data) {
    global $API_KEY, $API_URL_CURRENT;
    
    // Construir URL baseado nos parâmetros
    if (isset($data['city']) && !empty($data['city'])) {
        // Busca por nome da cidade
        $city = urlencode(trim($data['city']));
        $url = "{$API_URL_CURRENT}?q={$city}&appid={$API_KEY}&units=metric&lang=pt_br";
    } else {
        // Busca por coordenadas
        $lat = floatval($data['lat']);
        $lon = floatval($data['lon']);
        $url = "{$API_URL_CURRENT}?lat={$lat}&lon={$lon}&appid={$API_KEY}&units=metric&lang=pt_br";
    }
    
    // Fazer requisição
    $response = makeApiRequest($url);
    
    if ($response === false) {
        sendResponse(false, null, 'Erro ao conectar com o serviço meteorológico', 503);
    }
    
    $weatherData = json_decode($response, true);
    
    if (!$weatherData) {
        logError("Erro ao decodificar resposta da API", ['response' => substr($response, 0, 500)]);
        sendResponse(false, null, 'Erro ao processar dados meteorológicos', 502);
    }
    
    // Verificar erros da API
    if (isset($weatherData['cod']) && $weatherData['cod'] != 200) {
        $message = translateApiError($weatherData['cod'], $weatherData['message'] ?? '');
        sendResponse(false, null, $message, 400);
    }
    
    // Validar estrutura dos dados essenciais
    if (!isset($weatherData['main']) || !isset($weatherData['weather']) || !isset($weatherData['coord'])) {
        logError("Estrutura de dados inválida", ['data' => $weatherData]);
        sendResponse(false, null, 'Dados meteorológicos incompletos', 502);
    }
    
    sendResponse(true, $weatherData, 'Dados do clima obtidos com sucesso');
}

/**
 * Buscar previsão do tempo
 */
function handleForecast($data) {
    global $API_KEY, $API_URL_FORECAST;
    
    $lat = floatval($data['lat']);
    $lon = floatval($data['lon']);
    $url = "{$API_URL_FORECAST}?lat={$lat}&lon={$lon}&appid={$API_KEY}&units=metric&lang=pt_br";
    
    // Fazer requisição
    $response = makeApiRequest($url);
    
    if ($response === false) {
        sendResponse(false, null, 'Erro ao conectar com o serviço de previsão', 503);
    }
    
    $forecastData = json_decode($response, true);
    
    if (!$forecastData) {
        logError("Erro ao decodificar previsão", ['response' => substr($response, 0, 500)]);
        sendResponse(false, null, 'Erro ao processar dados de previsão', 502);
    }
    
    // Verificar erros da API
    if (isset($forecastData['cod']) && $forecastData['cod'] != '200') {
        $message = translateApiError($forecastData['cod'], $forecastData['message'] ?? '');
        sendResponse(false, null, $message, 400);
    }
    
    // Validar estrutura
    if (!isset($forecastData['list']) || !is_array($forecastData['list'])) {
        logError("Estrutura de previsão inválida", ['data' => $forecastData]);
        sendResponse(false, null, 'Dados de previsão incompletos', 502);
    }
    
    sendResponse(true, $forecastData, 'Previsão obtida com sucesso');
}

/**
 * Traduzir códigos de erro da API
 */
function translateApiError($code, $originalMessage) {
    $translations = [
        '400' => 'Parâmetros de busca inválidos',
        '401' => 'Chave de API inválida ou não autorizada',
        '404' => 'Cidade não encontrada. Tente com outro nome ou verifique a grafia',
        '429' => 'Muitas requisições. Aguarde alguns minutos e tente novamente',
        '500' => 'Erro no serviço meteorológico. Tente novamente mais tarde',
        '502' => 'Serviço meteorológico temporariamente indisponível',
        '503' => 'Serviço meteorológico em manutenção'
    ];
    
    return $translations[$code] ?? "Erro no serviço meteorológico: $originalMessage";
}

?>