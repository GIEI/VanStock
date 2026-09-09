<?php
  require_once __DIR__ . '/i18n.php';
  $__vs_page     = 'index.php';
  $__vs_meta_key = 'home';
  // Include the header component with HTML head and navigation
  include __DIR__ . '/components/header.php';
?>

<section class="hero-section" id="home">
  <div class="container hero-grid">

    <div class="hero-text-content">
      <span class="tag-blue"><?php echo htmlspecialchars(t('hero.tag')); ?></span>
      <h1 class="hero-title"><?php echo t('hero.title'); ?></h1>
      <p class="hero-description">
        <?php echo htmlspecialchars(t('hero.description')); ?>
      </p>
      <div class="hero-actions">
        <a href="#contatti" class="btn-primary js-contact-trigger">
          <?php echo htmlspecialchars(t('hero.cta')); ?> <span class="icon">arrow_forward</span>
        </a>
      </div>
    </div>

    <div class="hero-image-container">
      <img src="/assets/hero_grid.png" alt="<?php echo htmlspecialchars(t('hero.image_alt')); ?>" class="hero-3d-img">
    </div>

  </div>
</section>

<section class="features-section" id="funzionalita">
  <div class="container features-grid">

    <div class="features-image-container">
      <img src="/assets/features_spiral.png" alt="<?php echo htmlspecialchars(t('features.image_alt')); ?>" class="features-3d-img">
    </div>

    <div class="features-text-content">
      <span class="tag-blue"><?php echo htmlspecialchars(t('features.tag')); ?></span>
      <h2 class="features-title"><?php echo htmlspecialchars(t('features.title')); ?></h2>

      <p class="features-description">
        <?php echo htmlspecialchars(t('features.description_1')); ?>
      </p>

      <p class="features-description">
        <?php echo htmlspecialchars(t('features.description_2')); ?>
      </p>
    </div>

  </div>
</section>

<section class="modules-section">
  <div class="container">
    <div class="modules-grid">
      
      <?php
      // List of modules to render (image filenames stay Italian: they are the
      // actual asset files on disk, unrelated to the UI language).
      $modules = [
        ['icon' => 'layers',       'key' => 'magazzino',   'image' => '/assets/Magazzino.png'],
        ['icon' => 'swap_horiz',   'key' => 'movimenti',   'image' => '/assets/Movimenti.png'],
        ['icon' => 'construction', 'key' => 'lavori',      'image' => '/assets/Lavori.png'],
        ['icon' => 'groups',       'key' => 'anagrafiche', 'image' => '/assets/Anagrafiche.png'],
        ['icon' => 'shopping_bag', 'key' => 'acquisti',    'image' => '/assets/Acquisti.png'],
        ['icon' => 'bar_chart',    'key' => 'presenze',    'image' => '/assets/Presenze.png'],
      ];

      foreach ($modules as $module):
        $title = t('modules.' . $module['key'] . '.title');
        $desc  = t('modules.' . $module['key'] . '.desc');
      ?>
        <div class="module-card js-module-trigger"
             data-module="<?php echo htmlspecialchars($title); ?>"
             data-image="<?php echo htmlspecialchars($module['image']); ?>">
          <div class="module-card-top">
            <div class="module-icon-wrap">
              <span class="icon"><?php echo $module['icon']; ?></span>
            </div>
            <span class="module-tag"><?php echo htmlspecialchars(t('modules.tag')); ?></span>
          </div>
          <h3 class="module-title"><?php echo htmlspecialchars($title); ?></h3>
          <p class="module-desc"><?php echo htmlspecialchars($desc); ?></p>
        </div>
      <?php endforeach; ?>
      
    </div>
  </div>
</section>

<section class="pricing-section" id="prezzi">
  <div class="container">
    
    <div class="pricing-header">
      <span class="tag-blue"><?php echo htmlspecialchars(t('pricing.tag')); ?></span>
      <h2 class="pricing-main-title"><?php echo htmlspecialchars(t('pricing.title')); ?></h2>
      <p class="pricing-subtitle"><?php echo htmlspecialchars(t('pricing.subtitle')); ?></p>
    </div>

    <div class="pricing-grid">
      <?php
      $plans = [
        ['key' => 'starter30', 'popular' => false, 'link' => '#contatti'],
        ['key' => 'basic',     'popular' => true,  'link' => '#contatti'],
        ['key' => 'enterprise','popular' => false, 'link' => '#contatti'],
      ];

      foreach ($plans as $plan):
        $planData = t('pricing.' . $plan['key']);
      ?>
        <div class="pricing-card <?php echo $plan['popular'] ? 'popular' : ''; ?>">
          <?php if ($plan['popular']): ?>
            <span class="popular-badge"><?php echo htmlspecialchars(t('pricing.popular_badge')); ?></span>
          <?php endif; ?>

          <h3 class="plan-name"><?php echo htmlspecialchars($planData['name']); ?></h3>
          <p class="plan-desc"><?php echo htmlspecialchars($planData['desc']); ?></p>

          <div class="plan-price-wrap">
            <span class="plan-price"><?php echo htmlspecialchars($planData['price']); ?></span>
            <?php if ($planData['period']): ?>
              <span class="plan-period"><?php echo htmlspecialchars($planData['period']); ?></span>
            <?php endif; ?>
          </div>

          <ul class="plan-features">
            <?php foreach ($planData['features'] as $feature): ?>
              <li>
                <span class="icon plan-check">check</span>
                <span><?php echo htmlspecialchars($feature); ?></span>
              </li>
            <?php endforeach; ?>
          </ul>

          <a href="<?php echo htmlspecialchars($plan['link']); ?>" class="btn-plan js-contact-trigger <?php echo $plan['popular'] ? 'btn-plan-primary' : 'btn-plan-outline'; ?>">
            <?php echo htmlspecialchars($planData['cta']); ?>
          </a>
        </div>
      <?php endforeach; ?>
    </div>

  </div>
</section>

<section class="cta-section">
  <div class="container">
    <div class="cta-banner">

      <div class="cta-content">
        <span class="cta-tag"><?php echo htmlspecialchars(t('cta_section.tag')); ?></span>
        <h2 class="cta-title"><?php echo htmlspecialchars(t('cta_section.title')); ?></h2>
        <p class="cta-text">
          <?php echo t('cta_section.text'); ?>
        </p>
      </div>

      <div class="cta-actions">
        <a href="#contatti" class="btn-white js-contact-trigger">
          <?php echo htmlspecialchars(t('cta_section.cta')); ?> <span class="icon">arrow_forward</span>
        </a>
      </div>

    </div>
  </div>
</section>

<div class="module-modal" id="moduleModal" role="dialog" aria-modal="true" aria-hidden="true" style="display: none;">
  <div class="module-modal__backdrop" data-module-close></div>
  <div class="module-modal__dialog" role="document">
    <button type="button" class="module-modal__close" aria-label="<?php echo htmlspecialchars(t('a11y.close')); ?>" data-module-close>&times;</button>
    <img class="module-modal__image" id="moduleModalImage" src="" alt="<?php echo htmlspecialchars(t('a11y.module_preview')); ?>">
  </div>
</div>

<div class="contact-modal" id="contactModal" role="dialog" aria-modal="true" aria-labelledby="contactModalTitle" aria-hidden="true" style="display: none;">
  <div class="contact-modal__backdrop" data-contact-close></div>
  <div class="contact-modal__dialog" role="document">
    <button type="button" class="contact-modal__close" aria-label="<?php echo htmlspecialchars(t('a11y.close')); ?>" data-contact-close>
      <span class="icon">close</span>
    </button>
    <h2 class="contact-modal__title" id="contactModalTitle"><?php echo htmlspecialchars(t('contact_modal.title')); ?></h2>
    <p class="contact-modal__subtitle"><?php echo htmlspecialchars(t('contact_modal.subtitle')); ?></p>

    <form id="contactForm" class="contact-form" novalidate>
      <div class="contact-form__honeypot" aria-hidden="true" style="display:none;">
        <label><?php echo htmlspecialchars(t('contact_modal.honeypot_label')); ?>
          <input type="text" name="website" tabindex="-1" autocomplete="off">
        </label>
      </div>

      <div class="contact-form__field">
        <label for="cf-name"><?php echo htmlspecialchars(t('contact_modal.name_label')); ?> <span class="req">*</span></label>
        <input id="cf-name" name="name" type="text" required maxlength="200" autocomplete="name">
      </div>
      <div class="contact-form__field">
        <label for="cf-email"><?php echo htmlspecialchars(t('contact_modal.email_label')); ?> <span class="req">*</span></label>
        <input id="cf-email" name="email" type="email" required maxlength="200" autocomplete="email">
      </div>
      <div class="contact-form__field">
        <label for="cf-phone"><?php echo htmlspecialchars(t('contact_modal.phone_label')); ?> <span class="req">*</span></label>
        <input id="cf-phone" name="phone" type="tel" required maxlength="50" autocomplete="tel">
      </div>
      <div class="contact-form__field">
        <label for="cf-message"><?php echo htmlspecialchars(t('contact_modal.message_label')); ?> <span class="req">*</span></label>
        <textarea id="cf-message" name="message" rows="5" required maxlength="5000"></textarea>
      </div>

      <div class="contact-form__status" id="contactFormStatus" role="status" aria-live="polite"></div>

      <div class="contact-form__actions">
        <button type="button" class="btn-outline" data-contact-close><?php echo htmlspecialchars(t('contact_modal.cancel')); ?></button>
        <button type="submit" class="btn-primary" id="contactFormSubmit"><?php echo htmlspecialchars(t('contact_modal.submit')); ?></button>
      </div>
    </form>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
  // Modal Immagini Moduli
  const moduleModal = document.getElementById('moduleModal');
  const moduleModalImg = document.getElementById('moduleModalImage');
  const moduleTriggers = document.querySelectorAll('.js-module-trigger');
  const moduleCloseBtns = document.querySelectorAll('[data-module-close]');

  moduleTriggers.forEach(trigger => {
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      const imgSrc = this.getAttribute('data-image');
      if (imgSrc && moduleModalImg) {
        moduleModalImg.src = imgSrc;
        moduleModal.style.display = 'flex';
        moduleModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  moduleCloseBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      if (moduleModal) {
        moduleModal.style.display = 'none';
        moduleModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  });

  // Modal Contatti
  const contactModal = document.getElementById('contactModal');
  const contactTriggers = document.querySelectorAll('.js-contact-trigger');
  const contactCloseBtns = document.querySelectorAll('[data-contact-close]');

  contactTriggers.forEach(trigger => {
    trigger.addEventListener('click', function (e) {
      // Se l'ancora punta a #contatti, apriamo la modale anziché scrollare
      if (this.getAttribute('href') === '#contatti') {
        e.preventDefault();
        if (contactModal) {
          contactModal.style.display = 'flex';
          contactModal.setAttribute('aria-hidden', 'false');
          document.body.style.overflow = 'hidden';
        }
      }
    });
  });

  contactCloseBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      if (contactModal) {
        contactModal.style.display = 'none';
        contactModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    });
  });

  // Chiusura con tasto ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (moduleModal && moduleModal.style.display === 'flex') {
        moduleModal.style.display = 'none';
        moduleModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
      if (contactModal && contactModal.style.display === 'flex') {
        contactModal.style.display = 'none';
        contactModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }
  });
});
</script>

<?php
  // Include the footer component with scripts and page close tags
  include 'components/footer.php';
?>