<?php
require __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json; charset=utf-8');

$cfg = require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// CORREZIONE: Cambiate le chiavi per combaciare con il payload JS (name, email, phone, message)
$name    = trim((string)($data['name']    ?? ''));
$email   = trim((string)($data['email']   ?? ''));
$phone   = trim((string)($data['phone']   ?? ''));
$message = trim((string)($data['message'] ?? ''));
$honey   = (string)($data['website']  ?? '');
// Leggiamo il timestamp come float per evitare l'overflow dei sistemi a 32bit/64bit su cast int
$ts      = isset($data['ts']) ? (float)$data['ts'] : 0;

// Honeypot
if ($honey !== '') {
    echo json_encode(['ok' => true, 'debug' => 'honeypot_triggered']);
    exit;
}

// Controllo dei 3 secondi convertendo il timestamp JS (ms) in secondi
$nowSeconds = microtime(true);
$openedSeconds = $ts / 1000;

if ($ts > 0 && ($nowSeconds - $openedSeconds) < 3.0) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_fast']);
    exit;
}

// Mandatory fields
if ($name === '' || $email === '' || $phone === '' || $message === '') {
    http_response_code(400);
    // Ti aggiungo questo dettaglio nel JSON per fare debug in console e capire se si blocca qui
    echo json_encode(['ok' => false, 'error' => 'missing_fields', 'received' => ['name' => $name, 'email' => $email, 'phone' => $phone, 'message' => $message]]);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_email']);
    exit;
}
if (strlen($message) > 5000 || strlen($name) > 200 || strlen($phone) > 50) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_long']);
    exit;
}

// Per-IP rate limit: max 3 sends per 10 minutes
$ip       = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile   = sys_get_temp_dir() . '/vanstock_contact_' . md5($ip) . '.log';
$now      = time();
$attempts = [];
if (file_exists($rlFile)) {
    $attempts = array_filter(
        array_map('intval', file($rlFile, FILE_IGNORE_NEW_LINES)),
        fn($t) => $t > $now - 600
    );
}
if (count($attempts) >= 3) {
    http_response_code(429);
    echo json_encode(['ok' => false, 'error' => 'rate_limited']);
    exit;
}
$attempts[] = $now;
file_put_contents($rlFile, implode("\n", $attempts));

// Sostituisci il blocco di invio con questo per fare il test:
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = $cfg['smtp_host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $cfg['smtp_user'];
    $mail->Password   = $cfg['smtp_password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $cfg['smtp_port'];
    $mail->CharSet    = 'UTF-8';

    // ATTIVIAMO IL LOG DIALOGO REALE
    $mail->SMTPDebug  = 0; 
    // Questo trucco reindirizza il debug di PHPMailer dentro la risposta del network
    $mail->Debugoutput = function($str, $level) { echo "$str\n"; }; 

    $mail->setFrom($cfg['mail_from'], $cfg['mail_from_name']);
    $mail->addAddress($cfg['mail_to']);
    $mail->addReplyTo($email, $name);

    $mail->Subject = '[VanStock] Nuova richiesta di contatto da ' . $name;
    $mail->Body    = "Nome: $name\nEmail: $email\nTelefono: $phone\n\nMessaggio:\n$message";

    $mail->send();
    
    echo json_encode(['ok' => true, 'status' => 'Inviata fisicamente!']);
    exit; // Blocca qui l'esecuzione per sputare fuori il log completo
    
} catch (Exception $e) {
    echo json_encode([
        'ok' => false, 
        'error' => 'mail_failed', 
        'phpmailer_error' => $mail->ErrorInfo
    ]);
    exit;
}