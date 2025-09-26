<?php
// Arquivo de teste p/ verificar PHP
header('Content-Type: application/json');

echo json_encode([
    'status' => 'ok',
    'message' => 'PHP está funcionando!',
    'timestamp' => date('Y-m-d H:i:s')
]);
?>