  <!-- Footer Section -->
  <footer class="site-footer" id="contatti">
    <div class="container">
      <div class="footer-top">

        <!-- Brand / About Column -->
        <div class="footer-brand">
          <a href="<?php echo htmlspecialchars(vs_url('index.php')); ?>" class="logo-wrapper">
            <img src="/assets/logo.png" alt="VanStock Logo" class="logo-img">
            <span class="logo-text">VanStock</span>
          </a>
          <p class="footer-brand-text">
            <?php echo htmlspecialchars(t('footer.brand_text')); ?>
          </p>
        </div>

        <!-- Navigation Links Column -->
        <div class="footer-column">
          <h3 class="footer-column-title"><?php echo htmlspecialchars(t('footer.nav_title')); ?></h3>
          <ul class="footer-links">
            <li><a href="#home" class="footer-link"><?php echo htmlspecialchars(t('nav.home')); ?></a></li>
            <li><a href="#prezzi" class="footer-link"><?php echo htmlspecialchars(t('nav.pricing')); ?></a></li>
            <li><a href="#contatti" class="footer-link js-contact-trigger"><?php echo htmlspecialchars(t('nav.contact')); ?></a></li>
          </ul>
        </div>

        <!-- Contact details Column -->
        <div class="footer-column">
          <h3 class="footer-column-title"><?php echo htmlspecialchars(t('footer.contact_title')); ?></h3>
          <div class="footer-contact-info">
            <a href="mailto:<?php echo htmlspecialchars(SITE_CONTACT_EMAIL); ?>" class="footer-contact-item"><?php echo htmlspecialchars(SITE_CONTACT_EMAIL); ?></a>
          </div>
        </div>

      </div>

      <!-- Footer Bottom Row -->
      <div class="footer-bottom">
        <span class="footer-copyright"><?php echo htmlspecialchars(t('footer.copyright')); ?></span>
        <div class="footer-bottom-links">
          <a href="<?php echo htmlspecialchars(vs_url('privacy.php')); ?>" class="footer-bottom-link"><?php echo htmlspecialchars(t('footer.privacy_link')); ?></a>
          <a href="#" class="footer-bottom-link"><?php echo htmlspecialchars(t('footer.terms_link')); ?></a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Interactivity Scripts -->
  <script>
    const I18N = <?php echo json_encode([
      'sending' => t('js.sending'),
      'success' => t('js.success'),
      'errors'  => [
        'missing_fields' => t('js.errors.missing_fields'),
        'invalid_email'  => t('js.errors.invalid_email'),
        'too_long'       => t('js.errors.too_long'),
        'too_fast'       => t('js.errors.too_fast'),
        'rate_limited'   => t('js.errors.rate_limited'),
        'mail_failed'    => t('js.errors.mail_failed'),
      ],
      'genericError' => t('js.generic_error'),
      'networkError' => t('js.network_error'),
    ], JSON_UNESCAPED_UNICODE); ?>;
  </script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Sticky header background on scroll
      const header = document.getElementById('header');
      window.addEventListener('scroll', function() {
        if (window.scrollY > 20) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      });
      
      // Mobile menu toggle logic
      const menuToggle = document.getElementById('menuToggle');
      const mainNav = document.getElementById('mainNav');
      
      menuToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        mainNav.classList.toggle('active');
        menuToggle.classList.toggle('active');
        
        // Animated icon transitions
        const spans = menuToggle.querySelectorAll('span');
        if (menuToggle.classList.contains('active')) {
          spans[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
          spans[1].style.opacity = '0';
          spans[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
        } else {
          spans[0].style.transform = 'none';
          spans[1].style.opacity = '1';
          spans[2].style.transform = 'none';
        }
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', function(e) {
        if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
          mainNav.classList.remove('active');
          menuToggle.classList.remove('active');
          const spans = menuToggle.querySelectorAll('span');
          spans[0].style.transform = 'none';
          spans[1].style.opacity = '1';
          spans[2].style.transform = 'none';
        }
      });
      
      // Smooth navigation scrolls for anchor links
      const anchorLinks = document.querySelectorAll('a[href^="#"]');
      anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
          // Contact-trigger links are handled by the contact modal logic below
          if (this.classList.contains('js-contact-trigger')) return;

          const targetId = this.getAttribute('href');
          if (targetId === '#') return;

          e.preventDefault();
          const targetElement = document.querySelector(targetId);
          if (targetElement) {
            // Close mobile menu if open
            mainNav.classList.remove('active');
            menuToggle.classList.remove('active');
            const spans = menuToggle.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.opacity = '1';
            spans[2].style.transform = 'none';
            
            // Calculate offsets
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        });
      });
    });

    // ── Module modal logic ─────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
      const modal = document.getElementById('moduleModal');
      const img = modal.querySelector('.module-modal__image');
      if (!modal) return;

      function openModule(imagePath, moduleName) {
        img.src = imagePath;
        img.alt = moduleName;
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }

      function closeModule() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        img.src = '';
      }

      // Open triggers
      document.querySelectorAll('.js-module-trigger').forEach(el => {
        el.addEventListener('click', function() {
          const imagePath = this.getAttribute('data-image');
          const moduleName = this.getAttribute('data-module');
          openModule(imagePath, moduleName);
        });
      });

      // Close triggers (backdrop, ESC)
      modal.querySelector('[data-module-close]').addEventListener('click', closeModule);
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModule();
      });
    });

    // ── Contact modal logic ────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function() {
      const modal       = document.getElementById('contactModal');
      const form        = document.getElementById('contactForm');
      const statusEl    = document.getElementById('contactFormStatus');
      const submitBtn   = document.getElementById('contactFormSubmit');
      if (!modal || !form) return;

      let formOpenedAt = 0; // ms; used by send.php anti-spam time-check

      function openModal(e) {
        if (e) e.preventDefault();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        formOpenedAt = Date.now();
        statusEl.textContent = '';
        statusEl.className = 'contact-form__status';
        setTimeout(() => { const first = form.querySelector('input[name="name"]'); if (first) first.focus(); }, 50);
      }

      function closeModal() {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      // Open triggers
      document.querySelectorAll('.js-contact-trigger').forEach(el => {
        el.addEventListener('click', openModal);
      });

      // Close triggers (backdrop, X, cancel, ESC)
      modal.querySelectorAll('[data-contact-close]').forEach(el => {
        el.addEventListener('click', closeModal);
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
      });

      // Submit
      form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        submitBtn.disabled = true;
        statusEl.textContent = I18N.sending;
        statusEl.className = 'contact-form__status';

        const payload = {
          name:    form.name.value.trim(),
          email:   form.email.value.trim(),
          phone:   form.phone.value.trim(),
          message: form.message.value.trim(),
          website: form.website.value, // honeypot
          ts:      formOpenedAt,
        };

        try {
          const res  = await fetch('send.php', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));

          if (res.ok && data.ok) {
            statusEl.textContent = I18N.success;
            statusEl.className = 'contact-form__status is-success';
            form.reset();
            setTimeout(closeModal, 2000);
          } else {
            statusEl.textContent = I18N.errors[data.error] || I18N.genericError;
            statusEl.className = 'contact-form__status is-error';
          }
        } catch (err) {
          statusEl.textContent = I18N.networkError;
          statusEl.className = 'contact-form__status is-error';
        } finally {
          submitBtn.disabled = false;
        }
      });
    });
  </script>
</body>
</html>
