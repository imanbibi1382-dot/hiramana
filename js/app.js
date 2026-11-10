/**
 * app.js
 * کنترلر اصلی ارائه وب تعاملی هلدینگ هیرامانا (ویرایش مرحله ۲)
 * خلوت‌سازی کارت‌ها، انطباق دقیق امتیازها و ستاره‌ها، تفکیک قیمت‌ها و بهبود صفحه جمع‌بندی
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// ترتیب ویوها برای ناوبری اسلایدی
const VIEW_SEQUENCE = [
  'view-intro',
  'view-overview',
  'view-domain-marketing',
  'view-domain-branding',
  'view-domain-social_media',
  'view-domain-video_production',
  'view-summary'
];

let currentViewIndex = 0;

function initApp() {
  renderAllViews();
  setupNavigation();
  setupKeyboardShortcuts();
  setupCompareDock();
  setupStateListeners();
  
  // بارگذاری یادداشت‌های جلسه
  const meetingNotesInput = document.getElementById('meeting-notes-input');
  if (meetingNotesInput && window.stateManager) {
    meetingNotesInput.value = window.stateManager.getMeetingNotes();
    meetingNotesInput.addEventListener('input', (e) => {
      window.stateManager.setMeetingNotes(e.target.value);
    });
  }

  // بررسی هش آدرس برای پرش مستقیم به اسلاید
  if (window.location.hash) {
    const hashView = window.location.hash.replace('#', '');
    const foundIdx = VIEW_SEQUENCE.indexOf(hashView);
    if (foundIdx !== -1) {
      navigateToIndex(foundIdx);
      return;
    }
  }

  // نمایش اسلاید ابتدایی
  navigateToIndex(0);
}

window.addEventListener('hashchange', () => {
  if (window.location.hash) {
    const hashView = window.location.hash.replace('#', '');
    const foundIdx = VIEW_SEQUENCE.indexOf(hashView);
    if (foundIdx !== -1) {
      navigateToIndex(foundIdx);
    }
  }
});

/**
 * تبدیل ارقام انگلیسی به فارسی
 */
function toPersianDigits(str) {
  if (str === null || str === undefined) return '';
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/[0-9]/g, (d) => farsiDigits[d]);
}

window.toPersianDigits = toPersianDigits;

/**
 * تولید کد HTML ستاره‌ها با انطباق دقیق ریاضی بر امتیاز عددی از ۵
 * پشتیبانی کامل از نیم‌ستاره (Half-star) و علامت‌گذاری نیازمند ارزیابی
 */
function renderStarsHtml(numericScore) {
  if (numericScore === null || numericScore === undefined || isNaN(numericScore)) {
    return `<span class="rating-unrated-tag">نیازمند ارزیابی</span>`;
  }

  const score = parseFloat(numericScore);
  const fullStars = Math.floor(score);
  const remainder = score - fullStars;

  let extraFull = 0;
  let hasHalf = false;

  if (remainder >= 0.75) {
    extraFull = 1;
  } else if (remainder >= 0.25) {
    hasHalf = true;
  }

  const totalFilled = fullStars + extraFull;
  const emptyStars = Math.max(0, 5 - totalFilled - (hasHalf ? 1 : 0));

  let starsStr = '';
  for (let i = 0; i < totalFilled; i++) {
    starsStr += '<span class="star-icon star-full">★</span>';
  }
  if (hasHalf) {
    starsStr += '<span class="star-icon star-half">⯨</span>';
  }
  for (let i = 0; i < emptyStars; i++) {
    starsStr += '<span class="star-icon star-empty">☆</span>';
  }

  const formattedNum = toPersianDigits(score.toFixed(2).replace(/\.00$/, ''));

  return `
    <div class="stars-container" title="امتیاز ارزیابی تخصصی: ${formattedNum} از ۵">
      <span class="stars-cluster">${starsStr}</span>
      <span class="stars-numeric-label">${formattedNum} از ۵</span>
    </div>
  `;
}

window.renderStarsHtml = renderStarsHtml;

/**
 * رندر کردن کامل کارت‌ها و اطلاعات در تمام صفحات
 */
function renderAllViews() {
  if (!window.HIRAMANA_PRESENTATION_DATA) return;
  const { domains } = window.HIRAMANA_PRESENTATION_DATA;

  // رندر کارت‌های ۴ حوزه در نمای کلی (Overview)
  renderOverviewCards(domains);

  // رندر صفحات مستقل ۴ حوزه
  for (const domain of domains) {
    renderDomainPage(domain);
  }

  // رندر صفحه جمع‌بندی (Summary)
  renderSummaryPage();
}

/**
 * رندر کارت‌های صفحه نمای کلی
 */
function renderOverviewCards(domains) {
  const container = document.getElementById('overview-domains-grid');
  if (!container) return;

  container.innerHTML = domains.map((domain, index) => {
    const summary = window.stateManager ? window.stateManager.getDomainSummary(domain.id) : null;
    const hasFirstChoice = summary && summary.firstChoice;

    let statusPill = `<span class="overview-badge pending">⚠️ در انتظار انتخاب اول</span>`;
    if (hasFirstChoice) {
      statusPill = `<span class="overview-badge decided">⭐ انتخاب اول: ${summary.firstChoice.provider_name}</span>`;
    }

    return `
      <div class="overview-domain-card" onclick="navigateTo('view-domain-${domain.id}')">
        <div class="overview-card-header">
          <span class="domain-number-badge">حوزه ${toPersianDigits(index + 1)}</span>
          <span class="options-count-badge">${toPersianDigits(domain.options.length)} گزینه منتخب</span>
        </div>
        <h3 class="overview-domain-title">${domain.name_fa}</h3>
        <p class="overview-domain-subtitle">${domain.subtitle}</p>
        <div class="overview-card-footer">
          ${statusPill}
          <span class="btn-enter-domain">ورود و بررسی گزینه‌ها ←</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * رندر صفحه اختصاصی هر حوزه با ۴ گزینه منتخب (خلوت‌تر، شفاف‌تر و سریع‌الانتقال)
 */
function renderDomainPage(domain) {
  const container = document.getElementById(`cards-container-${domain.id}`);
  if (!container) return;

  container.innerHTML = domain.options.map((opt) => {
    const dec = window.stateManager ? window.stateManager.getOptionState(opt.id) : { status: 'none', note: '' };
    const isCompared = window.compareEngine ? window.compareEngine.isSelected(opt.id) : false;

    // استخراج وضعیت اطلاعات
    let statusClass = 'status-verified';
    let statusLabel = 'تأییدشده در ممیزی';
    if (opt.status_note.includes('اعلام نشده') || opt.tuition === 'اعلام نشده') {
      statusClass = 'status-unannounced';
      statusLabel = 'اطلاعات اعلام‌نشده';
    } else if (opt.status_note.includes('نیازمند تأیید') || opt.status_note.includes('نیازمند استعلام')) {
      statusClass = 'status-pending';
      statusLabel = opt.status_note.includes('سرفصل') ? 'نیازمند استعلام سرفصل' : 'نیازمند استعلام جاری';
    }

    return `
      <div class="option-card ${dec.status !== 'none' ? 'card-decided-' + dec.status : ''}" id="card-${opt.id}">
        
        <!-- نوار بالایی کارت: رتبه و وضعیت ممیزی -->
        <div class="card-top-bar">
          <div class="rank-tag ${opt.rank === 1 ? 'rank-1' : ''}">${opt.rank_display}</div>
          <div class="card-status-badge ${statusClass}">${statusLabel}</div>
        </div>

        <!-- نام مؤسسه یا استاد (واضح و برجسته) -->
        <h3 class="provider-heading">${opt.provider_name}</h3>

        <!-- عنوان دوره (خلاصه و تمیز) -->
        <div class="course-name-box">
          <div class="course-title-text">${opt.course_title || opt.course_full}</div>
          ${opt.instructor_display && opt.instructor_display !== opt.provider_name ? `
            <div class="course-instructor-text">👨‍🏫 مدرس: ${opt.instructor_display}</div>
          ` : ''}
        </div>

        <!-- نوار فشرده ۳ شاخص کلیدی در یک نگاه (مدت | شهریه | محل و شیوه) -->
        <div class="card-quick-metrics">
          <div class="metric-pill" title="مدت دوره">
            <span class="m-icon">⏱</span>
            <span class="m-val">${opt.duration}</span>
          </div>
          <div class="metric-pill pill-tuition" title="شهریه و شرایط مالی">
            <span class="m-icon">💳</span>
            <span class="m-val highlight-tuition">${opt.tuition_current || opt.tuition}</span>
          </div>
          <div class="metric-pill" title="نحوه و محل برگزاری">
            <span class="m-icon">📍</span>
            <span class="m-val">${opt.format_compact || opt.format_location}</span>
          </div>
        </div>

        <!-- نوار ارزیابی تخصصی ۱۰۰ امتیازی پژوهش هلدینگ -->
        <div class="rating-bar-box">
          <div class="rating-info">
            ${renderStarsHtml(opt.numeric_score)}
            <span class="rating-badge-caption">ارزیابی تخصصی پژوهش</span>
          </div>
        </div>

        <!-- دکمه‌های انتخاب وضعیت تصمیم در جلسه -->
        <div class="decision-selector-box">
          <div class="segmented-control">
            <button class="seg-btn ${dec.status === 'first_choice' ? 'active choice-1' : ''}" 
              onclick="setDecisionFromUI('${opt.id}', 'first_choice', '${opt.domain_id}')">
              ⭐ انتخاب اول
            </button>
            <button class="seg-btn ${dec.status === 'alternative' ? 'active choice-alt' : ''}" 
              onclick="setDecisionFromUI('${opt.id}', 'alternative', '${opt.domain_id}')">
              🔄 جایگزین
            </button>
            <button class="seg-btn ${dec.status === 'needs_review' ? 'active choice-review' : ''}" 
              onclick="setDecisionFromUI('${opt.id}', 'needs_review', '${opt.domain_id}')">
              🔍 بررسی
            </button>
            <button class="seg-btn ${dec.status === 'rejected' ? 'active choice-reject' : ''}" 
              onclick="setDecisionFromUI('${opt.id}', 'rejected', '${opt.domain_id}')">
              ✕ رد
            </button>
          </div>
        </div>

        <!-- یادداشت اختصاصی کارت -->
        <div class="card-note-wrapper">
          <input type="text" class="card-note-input" placeholder="یادداشت مدیران درباره این گزینه..." 
            value="${escapeHtml(dec.note || '')}" 
            onchange="setNoteFromUI('${opt.id}', this.value)" />
        </div>

        <!-- دکمه‌های اقدام زیر کارت -->
        <div class="card-actions">
          <button class="btn-card-detail" onclick="openDetailModal('${opt.id}')">
            🔍 جزئیات کامل
          </button>
          <button class="btn-card-compare ${isCompared ? 'in-compare' : ''}" 
            onclick="toggleCompareOption('${opt.id}')">
            ${isCompared ? '✓ در لیست مقایسه' : '⚖ افزودن به مقایسه'}
          </button>
        </div>

      </div>
    `;
  }).join('');
}

/**
 * رندر صفحه جمع‌بندی نهایی (برجسته‌سازی انتخاب اول، تفکیک کامل دسته‌ها و نمایش وضعیت عدم انتخاب)
 */
function renderSummaryPage() {
  const container = document.getElementById('summary-content-container');
  if (!container || !window.stateManager) return;

  const summaries = window.stateManager.getAllSummary();
  let totalFirstChoices = 0;
  let totalAlternatives = 0;
  let totalNeedsReview = 0;
  let totalRejected = 0;

  for (const s of summaries) {
    if (s.firstChoice) totalFirstChoices++;
    if (s.alternative) totalAlternatives++;
    totalNeedsReview += s.needsReview.length;
    totalRejected += s.rejected.length;
  }

  let html = `
    <!-- شاخص‌های کلیدی جلسه -->
    <div class="summary-kpis-grid">
      <div class="kpi-card kpi-total">
        <span class="kpi-number">${toPersianDigits(16)}</span>
        <span class="kpi-label">کل گزینه‌های ممیزی‌شده</span>
      </div>
      <div class="kpi-card kpi-first">
        <span class="kpi-number">${toPersianDigits(totalFirstChoices)} از ${toPersianDigits(4)}</span>
        <span class="kpi-label">انتخاب اول مصوب حوزه‌ها</span>
      </div>
      <div class="kpi-card kpi-alt">
        <span class="kpi-number">${toPersianDigits(totalAlternatives)}</span>
        <span class="kpi-label">گزینه‌های جایگزین (Reserve)</span>
      </div>
      <div class="kpi-card kpi-review">
        <span class="kpi-number">${toPersianDigits(totalNeedsReview)}</span>
        <span class="kpi-label">نیازمند استعلام / مذاکره</span>
      </div>
    </div>

    <!-- جدول تفکیکی تصمیم‌ها برای هر حوزه -->
    <div class="summary-domains-list">
  `;

  for (const s of summaries) {
    html += `
      <div class="summary-domain-block ${s.firstChoice ? 'domain-resolved' : 'domain-pending'}">
        <div class="summary-block-header">
          <h3 class="summary-domain-name">حوزه تخصصی: ${s.domainName}</h3>
          <span class="summary-domain-status ${s.firstChoice ? 'has-choice' : 'no-choice'}">
            ${s.firstChoice ? '✓ انتخاب اول تعیین شد' : '⚠️ هنوز انتخاب نشده است'}
          </span>
        </div>

        <div class="summary-decisions-grid">
          
          <!-- ۱. انتخاب اول (برجسته‌ترین بخش) -->
          <div class="summary-item-box box-first-choice ${!s.firstChoice ? 'box-unselected' : ''}">
            <span class="item-box-tag">⭐ انتخاب اول هلدینگ</span>
            ${s.firstChoice ? `
              <div class="item-box-title">${s.firstChoice.provider_name}</div>
              <div class="item-box-course">${s.firstChoice.course_title || s.firstChoice.course_full}</div>
              <div class="item-box-meta">
                <span><strong>شهریه جاری:</strong> ${s.firstChoice.tuition_current || s.firstChoice.tuition}</span>
                <span class="meta-separator">•</span>
                <span><strong>مدت:</strong> ${s.firstChoice.duration}</span>
              </div>
              ${s.firstChoice.note ? `<div class="item-box-note">📝 <strong>یادداشت مصوب:</strong> ${escapeHtml(s.firstChoice.note)}</div>` : ''}
            ` : `
              <div class="item-box-empty-prompt">
                <span class="empty-warn-icon">⚠️</span>
                <strong>هنوز انتخاب اول ثبت نشده است.</strong>
                <button class="btn-jump-to-domain" onclick="navigateTo('view-domain-${s.domainId}')">
                  رفتن به این حوزه و انتخاب گزینه ←
                </button>
              </div>
            `}
          </div>

          <!-- ۲. گزینه جایگزین (Reserve) -->
          <div class="summary-item-box box-alternative">
            <span class="item-box-tag">🔄 گزینه جایگزین (Reserve)</span>
            ${s.alternative ? `
              <div class="item-box-title">${s.alternative.provider_name}</div>
              <div class="item-box-course">${s.alternative.course_title || s.alternative.course_full}</div>
              <div class="item-box-meta">
                <span><strong>شهریه:</strong> ${s.alternative.tuition_current || s.alternative.tuition}</span>
              </div>
              ${s.alternative.note ? `<div class="item-box-note">📝 ${escapeHtml(s.alternative.note)}</div>` : ''}
            ` : `
              <div class="item-box-empty">گزینه جایگزین تعیین نشده است.</div>
            `}
          </div>

          <!-- ۳. نیازمند بررسی و استعلام -->
          <div class="summary-item-box box-needs-review">
            <span class="item-box-tag">🔍 نیازمند بررسی و استعلام (${toPersianDigits(s.needsReview.length)})</span>
            ${s.needsReview.length > 0 ? `
              <ul class="summary-mini-list">
                ${s.needsReview.map(r => `
                  <li>
                    <strong>${r.provider_name}:</strong> ${r.status_note}
                    ${r.note ? `<br/><small>📝 ${escapeHtml(r.note)}</small>` : ''}
                  </li>
                `).join('')}
              </ul>
            ` : `
              <div class="item-box-empty">موردی در این دسته نیست.</div>
            `}
          </div>

          <!-- ۴. موارد ردشده -->
          <div class="summary-item-box box-rejected">
            <span class="item-box-tag">✕ موارد ردشده (${toPersianDigits(s.rejected.length)})</span>
            ${s.rejected.length > 0 ? `
              <ul class="summary-mini-list rejected-list">
                ${s.rejected.map(r => `
                  <li>${r.provider_name} ${r.note ? `— <small>${escapeHtml(r.note)}</small>` : ''}</li>
                `).join('')}
              </ul>
            ` : `
              <div class="item-box-empty">موردی رد نشده است.</div>
            `}
          </div>

        </div>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

/**
 * به‌روزرسانی وضعیت یک تصمیم از روی UI
 */
window.setDecisionFromUI = function(optionId, status, domainId) {
  if (!window.stateManager) return;
  const current = window.stateManager.getOptionState(optionId);
  
  // اگر روی همان کلیک کرد، لغو کند
  const newStatus = current.status === status ? 'none' : status;
  window.stateManager.setDecision(optionId, newStatus, domainId);
  
  showToast(`تصمیم برای این گزینه به‌روزرسانی شد.`, 'success');
};

/**
 * ذخیره یادداشت یک گزینه از روی UI
 */
window.setNoteFromUI = function(optionId, text) {
  if (!window.stateManager) return;
  window.stateManager.setOptionNote(optionId, text);
};

/**
 * شنونده تغییرات StateManager برای به‌روزرسانی صفحه
 */
function setupStateListeners() {
  if (!window.stateManager) return;
  window.stateManager.subscribe(() => {
    renderAllViews();
    updateProgressIndicator();
  });
}

/**
 * مدیریت ناوبری بین اسلایدها
 */
function setupNavigation() {
  document.querySelectorAll('[data-navigate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-navigate');
      navigateTo(targetView);
    });
  });

  const nextBtn = document.getElementById('btn-nav-next');
  const prevBtn = document.getElementById('btn-nav-prev');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentViewIndex < VIEW_SEQUENCE.length - 1) {
        navigateToIndex(currentViewIndex + 1);
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentViewIndex > 0) {
        navigateToIndex(currentViewIndex - 1);
      }
    });
  }
}

function navigateTo(viewId) {
  const index = VIEW_SEQUENCE.indexOf(viewId);
  if (index !== -1) {
    navigateToIndex(index);
  }
}

window.navigateTo = navigateTo;

function navigateToIndex(index) {
  if (index < 0 || index >= VIEW_SEQUENCE.length) return;
  currentViewIndex = index;
  const targetId = VIEW_SEQUENCE[index];

  // مخفی کردن تمامی ویوها
  document.querySelectorAll('.presentation-view').forEach(view => {
    view.classList.remove('active');
  });

  // فعال‌سازی ویوی جاری
  const targetView = document.getElementById(targetId);
  if (targetView) {
    targetView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // به‌روزرسانی هش در URL
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, null, '#' + targetId);
  }

  // به‌روزرسانی نوار بالایی و نشانگر وضعیت
  updateProgressIndicator();
}

function updateProgressIndicator() {
  const currentViewId = VIEW_SEQUENCE[currentViewIndex];
  
  // تنظیم لینک‌های نوبار
  document.querySelectorAll('.nav-step-item').forEach(item => {
    const target = item.getAttribute('data-navigate');
    if (target === currentViewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // شمارنده اسلاید
  const pageCounter = document.getElementById('slide-counter-display');
  if (pageCounter) {
    pageCounter.textContent = `اسلاید ${toPersianDigits(currentViewIndex + 1)} از ${toPersianDigits(VIEW_SEQUENCE.length)}`;
  }

  // غیرفعال کردن دکمه‌های ناوبری در انتها و ابتدا
  const prevBtn = document.getElementById('btn-nav-prev');
  const nextBtn = document.getElementById('btn-nav-next');
  if (prevBtn) prevBtn.disabled = (currentViewIndex === 0);
  if (nextBtn) nextBtn.disabled = (currentViewIndex === VIEW_SEQUENCE.length - 1);

  // نمایش یا عدم نمایش هدر چسبان در صفحه اول
  const mainHeader = document.getElementById('main-presentation-header');
  if (mainHeader) {
    if (currentViewIndex === 0) {
      mainHeader.classList.add('header-on-intro');
    } else {
      mainHeader.classList.remove('header-on-intro');
    }
  }
}

/**
 * کلیدهای میانبر صفحه کلید
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ' ') {
      if (currentViewIndex < VIEW_SEQUENCE.length - 1) {
        e.preventDefault();
        navigateToIndex(currentViewIndex + 1);
      }
    } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
      if (currentViewIndex > 0) {
        e.preventDefault();
        navigateToIndex(currentViewIndex - 1);
      }
    } else if (e.key === 'Escape') {
      closeAllModals();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

window.toggleFullscreen = toggleFullscreen;

/**
 * داک شناور مقایسه
 */
function setupCompareDock() {
  if (!window.compareEngine) return;
  window.compareEngine.subscribe((selectedIds) => {
    const dock = document.getElementById('floating-compare-dock');
    const badge = document.getElementById('compare-count-badge');
    if (!dock) return;

    if (selectedIds.length > 0) {
      dock.classList.add('visible');
      if (badge) badge.textContent = toPersianDigits(selectedIds.length);
    } else {
      dock.classList.remove('visible');
    }

    renderAllViews();
  });
}

window.toggleCompareOption = function(optionId) {
  if (!window.compareEngine) return;
  window.compareEngine.toggleOption(optionId);
};

/**
 * مودال جزئیات کامل گزینه
 */
window.openDetailModal = function(optionId) {
  if (!window.HIRAMANA_PRESENTATION_DATA) return;
  let found = null;
  for (const dom of window.HIRAMANA_PRESENTATION_DATA.domains) {
    found = dom.options.find(o => o.id === optionId);
    if (found) break;
  }
  if (!found) return;

  const dec = window.stateManager ? window.stateManager.getOptionState(found.id) : { status: 'none', note: '' };
  const content = document.getElementById('detail-modal-body');
  if (!content) return;

  content.innerHTML = `
    <div class="detail-header-section">
      <div class="detail-rank-tag">${found.rank_display} | حوزه ${found.domain_name_fa}</div>
      <h2 class="detail-provider-name">${found.provider_name}</h2>
      <div class="detail-course-title">${found.course_full}</div>
    </div>

    <!-- جدول تفکیک مالی و مشخصات در مودال -->
    <div class="detail-metrics-grid">
      <div class="detail-metric-card">
        <span class="metric-title">مدت دوره</span>
        <span class="metric-val">${found.duration}</span>
      </div>
      <div class="detail-metric-card highlight-price">
        <span class="metric-title">شهریه جاری / اعلام‌شده</span>
        <span class="metric-val">${found.tuition_current || found.tuition}</span>
      </div>
      <div class="detail-metric-card">
        <span class="metric-title">نحوه و محل برگزاری</span>
        <span class="metric-val">${found.format_location}</span>
      </div>
      <div class="detail-metric-card">
        <span class="metric-title">سطح تخصصی دوره</span>
        <span class="metric-val">${found.level}</span>
      </div>
    </div>

    <!-- تفکیک جزئیات شهریه پایه و تخفیف -->
    ${found.tuition_base && found.tuition_base !== 'اعلام نشده' ? `
      <div class="detail-info-block financial-breakdown-box">
        <h4>💰 تفکیک شرایط مالی و تخفیف‌ها</h4>
        <div class="fin-breakdown-list">
          <div><strong>قیمت پایه:</strong> ${found.tuition_base}</div>
          ${found.tuition_discount && found.tuition_discount !== 'ندارد' && found.tuition_discount !== 'نامشخص' ? `
            <div style="color:var(--brand-amber);"><strong>تخفیف مقطعی ثبت‌شده:</strong> ${found.tuition_discount}</div>
          ` : ''}
          <div><strong>وضعیت استعلام مالی:</strong> <span class="tag-status-inline">${found.tuition_status}</span></div>
        </div>
      </div>
    ` : ''}

    <div class="detail-info-block">
      <h4>⭐ ارزیابی تخصصی و ممیزی شواهد</h4>
      <div class="rating-display-large">
        <div style="margin-bottom:8px;">${renderStarsHtml(found.numeric_score)}</div>
        <div class="rating-disclaimer">
          <strong>توجه حاکمیتی:</strong> این امتیاز بر اساس ارزیابی ماتریس ۱۰۰ امتیازی شواهد-محور (شامل تخصص مدرس، سطح پیشرفته، سابقه صنعتی، کیفیت متدولوژی و شفافیت) در پژوهش هلدینگ تعیین شده است و با نظرسنجی‌های عمومی اینترنتی ارتباطی ندارد.
        </div>
      </div>
    </div>

    <div class="detail-info-block">
      <h4>🔍 وضعیت اطلاعات و یادداشت‌های ممیزی</h4>
      <div class="status-note-box">${found.status_note}</div>
    </div>

    <div class="detail-info-block">
      <h4>📞 راه‌های ارتباطی و نشانی</h4>
      <div class="contact-box">${found.contact}</div>
    </div>

    <div class="detail-decision-footer">
      <h4>ثبت تصمیم برای این گزینه:</h4>
      <div class="segmented-control modal-decision-control">
        <button class="seg-btn ${dec.status === 'first_choice' ? 'active choice-1' : ''}" 
          onclick="setDecisionFromUI('${found.id}', 'first_choice', '${found.domain_id}'); openDetailModal('${found.id}');">
          ⭐ انتخاب اول
        </button>
        <button class="seg-btn ${dec.status === 'alternative' ? 'active choice-alt' : ''}" 
          onclick="setDecisionFromUI('${found.id}', 'alternative', '${found.domain_id}'); openDetailModal('${found.id}');">
          🔄 جایگزین
        </button>
        <button class="seg-btn ${dec.status === 'needs_review' ? 'active choice-review' : ''}" 
          onclick="setDecisionFromUI('${found.id}', 'needs_review', '${found.domain_id}'); openDetailModal('${found.id}');">
          🔍 بررسی
        </button>
        <button class="seg-btn ${dec.status === 'rejected' ? 'active choice-reject' : ''}" 
          onclick="setDecisionFromUI('${found.id}', 'rejected', '${found.domain_id}'); openDetailModal('${found.id}');">
          ✕ رد
        </button>
      </div>

      <div class="modal-note-box">
        <label>یادداشت مدیران برای این گزینه:</label>
        <input type="text" class="card-note-input" value="${escapeHtml(dec.note || '')}" 
          placeholder="افزودن یادداشت..." 
          onchange="setNoteFromUI('${found.id}', this.value)" />
      </div>
    </div>
  `;

  document.getElementById('modal-detail').classList.add('open');
};

/**
 * مودال مقایسه مستقیم
 */
window.openComparisonModal = function() {
  if (!window.compareEngine) return;
  const container = document.getElementById('compare-modal-body');
  if (!container) return;

  container.innerHTML = window.compareEngine.renderComparisonMatrix();
  document.getElementById('modal-compare').classList.add('open');
};

/**
 * مودال پشتیبان‌گیری و بازیابی داده‌ها
 */
window.openBackupModal = function() {
  document.getElementById('modal-backup').classList.add('open');
};

window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
};

/**
 * دانلود خروجی پشتیبان
 */
window.handleExportBackup = function() {
  if (window.stateManager) {
    window.stateManager.exportBackup();
    showToast('فایل پشتیبان تصمیم‌ها با موفقیت دانلود شد.', 'success');
  }
};

/**
 * بازیابی از فایل پشتیبان
 */
window.handleImportBackup = function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const res = window.stateManager.importBackup(content);
    if (res.success) {
      showToast('اطلاعات با موفقیت بازیابی شد.', 'success');
      closeAllModals();
    } else {
      showToast(res.error, 'error');
    }
  };
  reader.readAsText(file);
};

/**
 * بازنشانی اطلاعات با تأیید
 */
window.handleResetAll = function() {
  if (confirm('آیا از پاک‌سازی تمامی تصمیم‌ها و یادداشت‌های ثبت‌شده اطمینان دارید؟')) {
    window.stateManager.resetAll();
    if (window.compareEngine) window.compareEngine.clearAll();
    showToast('کلیه تصمیم‌ها پاک‌سازی شدند.', 'warning');
    closeAllModals();
  }
};

/**
 * پرینت گزارش رسمی جلسه
 */
window.printReport = function() {
  navigateTo('view-summary');
  setTimeout(() => {
    window.print();
  }, 300);
};

/**
 * نمایش اعلان‌های بازخورد کاربر (Toast)
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 3500);
}

window.showToast = showToast;

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose navigation, shortcuts and sequence for testing and external access
window.VIEW_SEQUENCE = VIEW_SEQUENCE;
window.navigateToIndex = navigateToIndex;
window.setupKeyboardShortcuts = setupKeyboardShortcuts;
window.toggleFullscreen = toggleFullscreen;
