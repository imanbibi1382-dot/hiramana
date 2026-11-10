/**
 * compare_engine.js
 * موتور مقایسه مستقیم و هم‌زمان گزینه‌های آموزشی (۲ تا ۴ گزینه)
 * ویرایش مرحله ۲: تفکیک ساختار مالی، برجسته‌سازی ردیف‌های کلیدی و اصلاح برچسب‌های اعلام‌نشده
 * پروژه: Marketing-Education-Research - ارائه وب هلدینگ هیرامانا
 */

class CompareEngine {
  constructor() {
    this.selectedIds = new Set();
    this.maxSelections = 4;
    this.listeners = [];
  }

  /**
   * افزودن شنونده برای تغییرات انتخاب مقایسه
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notify() {
    for (const cb of this.listeners) {
      cb(Array.from(this.selectedIds));
    }
  }

  /**
   * بررسی اینکه آیا گزینه‌ای در لیست مقایسه هست یا خیر
   */
  isSelected(optionId) {
    return this.selectedIds.has(optionId);
  }

  /**
   * تغییر وضعیت انتخاب برای مقایسه (Toggle)
   */
  toggleOption(optionId) {
    if (this.selectedIds.has(optionId)) {
      this.selectedIds.delete(optionId);
    } else {
      if (this.selectedIds.size >= this.maxSelections) {
        if (window.showToast) {
          window.showToast(`حداکثر ${this.maxSelections} گزینه را می‌توانید به صورت هم‌زمان مقایسه کنید.`, 'warning');
        }
        return false;
      }
      this.selectedIds.add(optionId);
    }
    this.notify();
    return true;
  }

  /**
   * حذف یک گزینه از لیست مقایسه
   */
  removeOption(optionId) {
    if (this.selectedIds.has(optionId)) {
      this.selectedIds.delete(optionId);
      this.notify();
    }
  }

  /**
   * پاک‌سازی کامل لیست مقایسه
   */
  clearAll() {
    this.selectedIds.clear();
    this.notify();
  }

  /**
   * دریافت اطلاعات کامل گزینه‌های انتخاب‌شده
   */
  getSelectedOptions() {
    if (!window.HIRAMANA_PRESENTATION_DATA) return [];
    const results = [];
    const allOptions = [];
    for (const dom of window.HIRAMANA_PRESENTATION_DATA.domains) {
      allOptions.push(...dom.options);
    }
    for (const id of this.selectedIds) {
      const found = allOptions.find(o => o.id === id);
      if (found) results.push(found);
    }
    return results;
  }

  /**
   * تولید کدهای HTML جدول مقایسه مستقیم
   */
  renderComparisonMatrix() {
    const options = this.getSelectedOptions();
    if (options.length === 0) {
      return `
        <div class="empty-compare-state">
          <div class="empty-icon">📊</div>
          <h3>هیچ گزینه‌ای برای مقایسه انتخاب نشده است</h3>
          <p>از روی کارت‌های هر دوره روی دکمه «افزودن به مقایسه» کلیک کنید تا ۲ تا ۴ گزینه را در کنار هم ارزیابی کنید.</p>
        </div>
      `;
    }

    let html = `
      <div class="comparison-table-wrapper">
        <table class="comparison-table">
          <thead>
            <tr>
              <th class="feature-col">شاخص‌های مقایسه</th>
    `;

    // ستون‌های هدر جدول
    for (const opt of options) {
      const dec = window.stateManager ? window.stateManager.getOptionState(opt.id) : { status: 'none' };
      html += `
        <th class="option-col">
          <div class="compare-header-card">
            <span class="compare-rank-badge">${opt.rank_display} | ${opt.domain_name_fa}</span>
            <div class="compare-provider-title">${opt.provider_name}</div>
            <div class="compare-current-status status-${dec.status}">
              ${this.getStatusBadgeText(dec.status)}
            </div>
            <button class="btn-remove-from-compare" onclick="window.compareEngine.removeOption('${opt.id}')" title="حذف از مقایسه">✕</button>
          </div>
        </th>
      `;
    }

    html += `
            </tr>
          </thead>
          <tbody>
    `;

    // ۱. نام مؤسسه یا استاد
    html += this.renderSimpleRow('نام مؤسسه / استاد', options, (opt) => `<strong>${opt.provider_name}</strong>`, true);

    // ۲. عنوان دوره
    html += this.renderSimpleRow('عنوان دوره', options, (opt) => opt.course_title || opt.course_full);

    // ۳. مدرسین دوره (ردیف کلیدی)
    html += this.renderSimpleRow('مدرس / هیئت علمی', options, (opt) => {
      const val = opt.instructor_display || 'اعلام نشده';
      if (val.includes('اعلام نشده')) {
        return `<span class="badge-unannounced">${val}</span>`;
      }
      return `<strong>${val}</strong>`;
    }, true);

    // ۴. مدت دوره (ردیف کلیدی)
    html += this.renderSimpleRow('مدت دوره', options, (opt) => {
      if (opt.duration.includes('اعلام نشده')) {
        return `<span class="badge-unannounced">${opt.duration}</span>`;
      }
      return `<strong>${opt.duration}</strong>`;
    }, true);

    // ۵. تفکیک ساختار مالی و شهریه (ردیف کلیدی ویژه)
    html += `
      <tr class="key-financial-row">
        <td class="row-label highlight-row-label">
          💰 ساختار مالی و شهریه
          <small style="display:block; font-size:0.7rem; color:var(--text-muted); font-weight:normal;">قیمت پایه، تخفیف و وضعیت استعلام</small>
        </td>
    `;
    for (const opt of options) {
      if (opt.tuition === 'اعلام نشده' || !opt.tuition_current) {
        html += `
          <td class="financial-cell pending-data-cell">
            <span class="badge-unannounced">اعلام نشده</span>
            <div class="financial-sub-detail">فاقد نرخ رسمی یا نیازمند استعلام خصوصی</div>
          </td>
        `;
      } else {
        html += `
          <td class="financial-cell">
            <div class="fin-current-price">
              <span class="fin-label">شهریه جاری:</span>
              <span class="fin-val">${opt.tuition_current || opt.tuition}</span>
            </div>
            ${opt.tuition_base && opt.tuition_base !== opt.tuition_current ? `
              <div class="fin-sub-row">
                <span class="fin-sub-label">قیمت پایه:</span>
                <span class="fin-sub-val">${opt.tuition_base}</span>
              </div>
            ` : ''}
            ${opt.tuition_discount && opt.tuition_discount !== 'ندارد' && opt.tuition_discount !== 'نامشخص' ? `
              <div class="fin-sub-row discount-row">
                <span class="fin-sub-label">تخفیف مقطعی:</span>
                <span class="fin-sub-val">${opt.tuition_discount}</span>
              </div>
            ` : ''}
            <div class="fin-status-tag ${opt.tuition_status.includes('نیازمند') ? 'tag-pending' : 'tag-confirmed'}">
              ${opt.tuition_status}
            </div>
          </td>
        `;
      }
    }
    html += `</tr>`;

    // ۶. نحوه و محل برگزاری (ردیف کلیدی)
    html += this.renderSimpleRow('نحوه و محل برگزاری', options, (opt) => {
      if (opt.format_location.includes('اعلام نشده')) {
        return `<span class="badge-unannounced">${opt.format_location}</span>`;
      }
      return opt.format_location;
    }, true);

    // ۷. سطح دوره
    html += this.renderSimpleRow('سطح تخصصی دوره', options, (opt) => opt.level);

    // ۸. امتیاز ارزیابی تخصصی (با دقت ستاره‌ها)
    html += `
      <tr>
        <td class="row-label">⭐ ارزیابی تخصصی پژوهش</td>
    `;
    for (const opt of options) {
      if (opt.numeric_score) {
        html += `
          <td>
            <div class="rating-cell">
              ${window.renderStarsHtml ? window.renderStarsHtml(opt.numeric_score) : `<span class="rating-stars-badge">${opt.rating_raw}</span>`}
              <span class="rating-meta-note">ماتریس ۱۰۰ امتیازی شواهد-محور</span>
            </div>
          </td>
        `;
      } else {
        html += `
          <td>
            <span class="badge-unannounced">نیازمند ارزیابی (فاقد امتیاز)</span>
          </td>
        `;
      }
    }
    html += `</tr>`;

    // ۹. وضعیت اطلاعات و ممیزی مستندات
    html += this.renderSimpleRow('وضعیت شواهد و ممیزی', options, (opt) => {
      return `<div class="table-audit-note">${opt.status_note}</div>`;
    });

    // ۱۰. راه‌های ارتباطی
    html += this.renderSimpleRow('راه‌های ارتباطی', options, (opt) => opt.contact);

    // ۱۱. ردیف ثبت تصمیم در جلسه درون جدول مقایسه
    html += `
      <tr class="decision-row">
        <td class="row-label">تصمیم جلسه</td>
    `;
    for (const opt of options) {
      const dec = window.stateManager ? window.stateManager.getOptionState(opt.id) : { status: 'none' };
      html += `
        <td>
          <div class="compare-decision-buttons">
            <button class="btn-decision btn-first-choice ${dec.status === 'first_choice' ? 'active' : ''}" 
              onclick="window.setDecisionFromUI('${opt.id}', 'first_choice', '${opt.domain_id}')">
              ✓ انتخاب اول
            </button>
            <button class="btn-decision btn-alternative ${dec.status === 'alternative' ? 'active' : ''}" 
              onclick="window.setDecisionFromUI('${opt.id}', 'alternative', '${opt.domain_id}')">
              جایگزین
            </button>
            <button class="btn-decision btn-needs-review ${dec.status === 'needs_review' ? 'active' : ''}" 
              onclick="window.setDecisionFromUI('${opt.id}', 'needs_review', '${opt.domain_id}')">
              نیازمند بررسی
            </button>
            <button class="btn-decision btn-rejected ${dec.status === 'rejected' ? 'active' : ''}" 
              onclick="window.setDecisionFromUI('${opt.id}', 'rejected', '${opt.domain_id}')">
              ردشده
            </button>
          </div>
        </td>
      `;
    }
    html += `</tr>`;

    html += `
          </tbody>
        </table>
      </div>
    `;

    return html;
  }

  renderSimpleRow(label, options, extractor, isHighlight = false) {
    let rowHtml = `
      <tr class="${isHighlight ? 'highlight-row' : ''}">
        <td class="row-label ${isHighlight ? 'highlight-row-label' : ''}">${label}</td>
    `;
    for (const opt of options) {
      const content = extractor(opt);
      rowHtml += `<td class="${isHighlight ? 'highlight-cell' : ''}">${content}</td>`;
    }
    rowHtml += `</tr>`;
    return rowHtml;
  }

  getStatusBadgeText(status) {
    switch (status) {
      case 'first_choice': return 'انتخاب اول';
      case 'alternative': return 'گزینه جایگزین';
      case 'needs_review': return 'نیازمند بررسی';
      case 'rejected': return 'ردشده';
      default: return 'بدون تصمیم';
    }
  }
}

// نمونه واحد سراسری
window.compareEngine = new CompareEngine();
