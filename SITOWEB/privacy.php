<?php
  require_once __DIR__ . '/i18n.php';
  $__vs_page     = 'privacy.php';
  $__vs_meta_key = 'privacy';
  include __DIR__ . '/components/header.php';
?>

<main class="privacy-page container">
  <div class="privacy-content">

    <h1 class="privacy-title"><?php echo htmlspecialchars(t('privacy.title')); ?></h1>
    <p class="privacy-updated"><?php echo htmlspecialchars(t('privacy.updated')); ?></p>

    <!-- TITOLARE -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s1_title')); ?></h2>
      <p><?php echo t('privacy.s1_body'); ?></p>
    </section>

    <!-- DATI RACCOLTI -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s2_title')); ?></h2>
      <p><?php echo t('privacy.s2_body_1'); ?></p>
      <p><?php echo t('privacy.s2_body_2'); ?></p>
    </section>

    <!-- BASE GIURIDICA -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s3_title')); ?></h2>
      <p><?php echo htmlspecialchars(t('privacy.s3_body')); ?></p>
    </section>

    <!-- CONSERVAZIONE -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s4_title')); ?></h2>
      <p><?php echo htmlspecialchars(t('privacy.s4_body')); ?></p>
    </section>

    <!-- DIRITTI -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s5_title')); ?></h2>
      <p><?php echo htmlspecialchars(t('privacy.s5_intro')); ?></p>
      <ul>
        <?php foreach (t('privacy.s5_list') as $item): ?>
          <li><?php echo htmlspecialchars($item); ?></li>
        <?php endforeach; ?>
      </ul>
      <p><?php echo t('privacy.s5_outro'); ?></p>
    </section>

    <!-- COOKIE POLICY -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s6_title')); ?></h2>
      <p><?php echo htmlspecialchars(t('privacy.s6_body_1')); ?></p>
      <p><?php echo htmlspecialchars(t('privacy.s6_body_2')); ?></p>
    </section>

    <!-- MODIFICHE -->
    <section class="privacy-section">
      <h2><?php echo htmlspecialchars(t('privacy.s7_title')); ?></h2>
      <p><?php echo htmlspecialchars(t('privacy.s7_body')); ?></p>
    </section>

    <div class="privacy-back">
      <a href="<?php echo htmlspecialchars(vs_url('index.php')); ?>" class="btn-outline"><?php echo htmlspecialchars(t('privacy.back_to_site')); ?></a>
    </div>

  </div>
</main>

<?php include __DIR__ . '/components/footer.php'; ?>
