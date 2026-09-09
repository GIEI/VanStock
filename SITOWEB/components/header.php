<?php
require_once __DIR__ . '/../i18n.php';

// Pagina corrente (es. 'index.php', 'privacy.php'), usata per costruire
// hreflang/canonical e il link dello switcher lingua.
$__vs_page = isset($__vs_page) ? $__vs_page : basename($_SERVER['SCRIPT_NAME']);
$__vs_meta_key = isset($__vs_meta_key) ? $__vs_meta_key : 'home';

$__vs_it_url  = SITE_BASE_URL . '/' . $__vs_page;
$__vs_en_url  = SITE_BASE_URL . '/en/' . $__vs_page;
$__vs_canonical = CURRENT_LANG === 'en' ? $__vs_en_url : $__vs_it_url;
?>
<!DOCTYPE html>
<html lang="<?php echo CURRENT_LANG; ?>">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo t('meta.' . $__vs_meta_key . '.title'); ?></title>
  <meta name="description" content="<?php echo htmlspecialchars(t('meta.' . $__vs_meta_key . '.description')); ?>">

  <!-- hreflang: l'italiano resta la lingua predefinita (x-default) -->
  <link rel="canonical" href="<?php echo htmlspecialchars($__vs_canonical); ?>">
  <link rel="alternate" hreflang="it" href="<?php echo htmlspecialchars($__vs_it_url); ?>">
  <link rel="alternate" hreflang="en" href="<?php echo htmlspecialchars($__vs_en_url); ?>">
  <link rel="alternate" hreflang="x-default" href="<?php echo htmlspecialchars($__vs_it_url); ?>">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="VanStock">
  <meta property="og:title" content="<?php echo htmlspecialchars(t('meta.' . $__vs_meta_key . '.title')); ?>">
  <meta property="og:description" content="<?php echo htmlspecialchars(t('meta.' . $__vs_meta_key . '.description')); ?>">
  <meta property="og:url" content="<?php echo htmlspecialchars($__vs_canonical); ?>">
  <meta property="og:image" content="<?php echo htmlspecialchars(SITE_BASE_URL . '/assets/hero_grid.png'); ?>">
  <meta property="og:locale" content="<?php echo CURRENT_LANG === 'en' ? 'en_US' : 'it_IT'; ?>">
  <meta property="og:locale:alternate" content="<?php echo CURRENT_LANG === 'en' ? 'it_IT' : 'en_US'; ?>">

  <!-- Structured data -->
  <script type="application/ld+json">
  <?php echo json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'Organization',
    'name' => 'VanStock',
    'url' => $__vs_canonical,
    'logo' => SITE_BASE_URL . '/assets/logo.png',
    'email' => SITE_CONTACT_EMAIL,
  ], JSON_UNESCAPED_SLASHES); ?>
  </script>

  <!-- CSS Stylesheets -->
  <link rel="stylesheet" href="/style.css">

  <!-- Material Icons & Fonts -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/assets/logo.png">
</head>
<body>

  <?php if (vs_should_suggest_english()): ?>
  <div class="lang-hint" id="langHint" role="note">
    <span><?php echo htmlspecialchars(t('lang_banner.text')); ?></span>
    <a href="<?php echo htmlspecialchars(vs_alt_url($__vs_page)); ?>" class="lang-hint__accept"><?php echo htmlspecialchars(t('lang_banner.accept')); ?></a>
    <a href="?dismiss_lang_hint=1" class="lang-hint__dismiss"><?php echo htmlspecialchars(t('lang_banner.dismiss')); ?></a>
  </div>
  <?php endif; ?>

  <!-- Header Section -->
  <header class="site-header" id="header">
    <div class="container header-container">

      <!-- Brand Logo & Title -->
      <a href="<?php echo htmlspecialchars(vs_url('index.php')); ?>" class="logo-wrapper">
        <img src="/assets/logo.png" alt="VanStock Logo" class="logo-img">
        <span class="logo-text">VanStock</span>
      </a>

      <!-- Desktop & Tablet Navigation -->
      <nav class="main-nav" id="mainNav">
        <a href="#home" class="nav-link"><?php echo htmlspecialchars(t('nav.home')); ?></a>
        <a href="#funzionalita" class="nav-link"><?php echo htmlspecialchars(t('nav.features')); ?></a>
        <a href="#prezzi" class="nav-link"><?php echo htmlspecialchars(t('nav.pricing')); ?></a>
        <a href="#contatti" class="nav-link js-contact-trigger"><?php echo htmlspecialchars(t('nav.contact')); ?></a>
      </nav>

      <!-- Client Access Button -->
      <a href="<?php echo htmlspecialchars(SITE_APP_URL); ?>" class="btn-primary btn-header-access" target="_blank" rel="noopener noreferrer">
        <?php echo htmlspecialchars(t('nav.client_access')); ?>
      </a>

      <!-- Language Switcher -->
      <a href="<?php echo htmlspecialchars(vs_alt_url($__vs_page)); ?>"
         class="lang-switcher"
         aria-label="<?php echo htmlspecialchars(CURRENT_LANG === 'en' ? t('lang_switcher.switch_to_it') : t('lang_switcher.switch_to_en')); ?>">
        <?php echo htmlspecialchars(CURRENT_LANG === 'en' ? t('lang_switcher.label_it') : t('lang_switcher.label_en')); ?>
      </a>

      <!-- Mobile Menu Toggle Button -->
      <button class="menu-toggle" id="menuToggle" aria-label="<?php echo htmlspecialchars(t('a11y.menu_toggle')); ?>">
        <span></span>
        <span></span>
        <span></span>
      </button>

    </div>
  </header>
