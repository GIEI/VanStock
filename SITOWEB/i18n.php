<?php
// Bootstrap i18n: lingua rilevata dal path URL (/en/... => en, altrimenti it).
// L'italiano resta sempre servito su root per compatibilità con gli URL esistenti.
if (!defined('VS_I18N_LOADED')) {
    define('VS_I18N_LOADED', true);
    $siteConfigPath = __DIR__ . '/site-config.php';
    $siteConfig = file_exists($siteConfigPath) ? require $siteConfigPath : [
        'base_url' => 'https://example.com',
        'app_url' => 'https://app.example.com',
        'contact_email' => 'contact@example.com',
    ];
    define('SITE_BASE_URL', rtrim($siteConfig['base_url'], '/'));
    define('SITE_APP_URL', $siteConfig['app_url']);
    define('SITE_CONTACT_EMAIL', $siteConfig['contact_email']);

    $__vs_path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    define('CURRENT_LANG', (strpos($__vs_path, '/en/') === 0 || $__vs_path === '/en') ? 'en' : 'it');

    $GLOBALS['__vs_dict']          = require __DIR__ . '/lang/' . CURRENT_LANG . '.php';
    $GLOBALS['__vs_dict_fallback'] = CURRENT_LANG === 'it' ? $GLOBALS['__vs_dict'] : require __DIR__ . '/lang/it.php';

    function vs_dict_get($dict, $key) {
        $node = $dict;
        foreach (explode('.', $key) as $part) {
            if (!is_array($node) || !array_key_exists($part, $node)) {
                return null;
            }
            $node = $node[$part];
        }
        return $node;
    }

    // Ritorna la stringa tradotta per $key; fallback automatico all'italiano se assente in EN.
    function t($key) {
        $val = vs_dict_get($GLOBALS['__vs_dict'], $key);
        if ($val === null) {
            $val = vs_dict_get($GLOBALS['__vs_dict_fallback'], $key);
        }
        return $val ?? $key;
    }

    // URL della pagina $page (es. 'index.php', 'privacy.php') nella lingua corrente.
    function vs_url($page) {
        $page = ltrim($page, '/');
        return CURRENT_LANG === 'en' ? '/en/' . $page : '/' . $page;
    }

    // URL della stessa pagina nell'altra lingua (usato dallo switcher).
    function vs_alt_url($page) {
        $page = ltrim($page, '/');
        return CURRENT_LANG === 'en' ? '/' . $page : '/en/' . $page;
    }

    // Persistenza: cookie tecnico strettamente necessario, usato solo per ricordare
    // l'ultima lingua scelta (non forza redirect da root, che resta sempre IT).
    if (CURRENT_LANG === 'en' && !isset($_COOKIE['vs_lang'])) {
        @setcookie('vs_lang', 'en', time() + 60 * 60 * 24 * 180, '/', '', false, true);
    }
    if (isset($_GET['dismiss_lang_hint'])) {
        @setcookie('vs_lang_hint_dismissed', '1', time() + 60 * 60 * 24 * 30, '/', '', false, true);
    }

    // Suggerimento non invasivo mostrato solo sulla home IT se il browser preferisce l'inglese.
    function vs_should_suggest_english() {
        if (CURRENT_LANG !== 'it') return false;
        if (!empty($_COOKIE['vs_lang_hint_dismissed'])) return false;
        $accept = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
        if ($accept === '') return false;
        $enPos = strpos($accept, 'en');
        $itPos = strpos($accept, 'it');
        if ($enPos === false) return false;
        return $itPos === false || $enPos < $itPos;
    }
}
