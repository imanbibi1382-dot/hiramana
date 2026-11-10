/**
 * state_manager.js
 * مدیریت وضعیت تصمیم‌گیری‌ها، یادداشت‌های جلسه و ذخیره‌سازی محلی (LocalStorage)
 * پروژه: Marketing-Education-Research - ارائه وب هلدینگ هیرامانا
 */

class StateManager {
  constructor() {
    this.STORAGE_KEY = 'hiramana_executive_decisions_v1';
    this.subscribers = [];
    this.state = this.loadState();
  }

  /**
   * ایجاد ساختار اولیه وضعیت
   */
  getDefaultState() {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      meetingNotes: '',
      decisions: {} // ساختار: { [optionId]: { status: 'none' | 'first_choice' | 'alternative' | 'needs_review' | 'rejected', note: '' } }
    };
  }

  /**
   * بارگذاری از LocalStorage با اعتبارسنجی
   */
  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...this.getDefaultState(),
            ...parsed,
            decisions: parsed.decisions || {}
          };
        }
      }
    } catch (e) {
      console.warn('عدم موفقیت در خواندن از LocalStorage، بازگشت به حالت پیش‌فرض:', e);
    }
    return this.getDefaultState();
  }

  /**
   * ذخیره وضعیت جاری در LocalStorage
   */
  saveState() {
    try {
      this.state.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('خطا در ذخیره وضعیت در LocalStorage:', e);
    }
    this.notifySubscribers();
  }

  /**
   * ثبت مشترکین برای دریافت رویداد تغییر وضعیت
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.subscribers.push(callback);
    }
  }

  /**
   * اطلاع‌رسانی به تمامی مشترکین
   */
  notifySubscribers() {
    for (const callback of this.subscribers) {
      try {
        callback(this.state);
      } catch (err) {
        console.error('خطا در اجرای مشترک StateManager:', err);
      }
    }
  }

  /**
   * دریافت وضعیت یک گزینه
   */
  getOptionState(optionId) {
    return this.state.decisions[optionId] || { status: 'none', note: '' };
  }

  /**
   * ثبت تصمیم برای یک گزینه
   * قانون بسیار مهم: در هر حوزه فقط یک «انتخاب اول» می‌تواند وجود داشته باشد.
   * اگر گزینه دیگری به عنوان انتخاب اول ثبت شود، انتخاب اول قبلی در همان حوزه تبدیل به گزینه جایگزین می‌شود.
   */
  setDecision(optionId, newStatus, domainId) {
    if (!this.state.decisions[optionId]) {
      this.state.decisions[optionId] = { status: 'none', note: '' };
    }

    const prevStatus = this.state.decisions[optionId].status;

    // اعمال محدودیت تک‌انتخاب اول در حوزه
    if (newStatus === 'first_choice' && domainId && window.HIRAMANA_PRESENTATION_DATA) {
      const domain = window.HIRAMANA_PRESENTATION_DATA.domains.find(d => d.id === domainId);
      if (domain) {
        for (const opt of domain.options) {
          if (opt.id !== optionId && this.state.decisions[opt.id]?.status === 'first_choice') {
            // جایگزین کردن وضعیت قبلی با "گزینه جایگزین"
            this.state.decisions[opt.id].status = 'alternative';
          }
        }
      }
    }

    this.state.decisions[optionId].status = newStatus;
    this.saveState();
  }

  /**
   * ثبت یادداشت برای یک گزینه
   */
  setOptionNote(optionId, noteText) {
    if (!this.state.decisions[optionId]) {
      this.state.decisions[optionId] = { status: 'none', note: '' };
    }
    this.state.decisions[optionId].note = noteText || '';
    this.saveState();
  }

  /**
   * ثبت یادداشت‌های عمومی جلسه
   */
  setMeetingNotes(notes) {
    this.state.meetingNotes = notes || '';
    this.saveState();
  }

  getMeetingNotes() {
    return this.state.meetingNotes || '';
  }

  /**
   * پاک‌سازی و بازنشانی کلیه تصمیم‌ها
   */
  resetAll() {
    this.state = this.getDefaultState();
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
    this.notifySubscribers();
  }

  /**
   * خروجی فایل پشتیبان JSON
   */
  exportBackup() {
    const backupData = {
      exportDate: new Date().toISOString(),
      presentation: 'هلدینگ هیرامانا - گزارش ارزیابی آموزش',
      ...this.state
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hiramana_meeting_decisions_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * بازیابی اطلاعات از فایل پشتیبان JSON
   */
  importBackup(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.state = {
          ...this.getDefaultState(),
          decisions: parsed.decisions || {},
          meetingNotes: parsed.meetingNotes || '',
          lastUpdated: new Date().toISOString()
        };
        this.saveState();
        return { success: true };
      }
      return { success: false, error: 'فرمت فایل معتبر نیست.' };
    } catch (e) {
      return { success: false, error: 'خطا در خواندن فایل JSON: ' + e.message };
    }
  }

  /**
   * محاسبه آمار تفکیکی تصمیم‌ها برای هر حوزه
   */
  getDomainSummary(domainId) {
    if (!window.HIRAMANA_PRESENTATION_DATA) return null;
    const domain = window.HIRAMANA_PRESENTATION_DATA.domains.find(d => d.id === domainId);
    if (!domain) return null;

    const summary = {
      domainId,
      domainName: domain.name_fa,
      firstChoice: null,
      alternative: null,
      needsReview: [],
      rejected: [],
      undecided: []
    };

    for (const opt of domain.options) {
      const dec = this.getOptionState(opt.id);
      const optSummary = { ...opt, decision: dec.status, note: dec.note };

      if (dec.status === 'first_choice') {
        summary.firstChoice = optSummary;
      } else if (dec.status === 'alternative') {
        summary.alternative = optSummary;
      } else if (dec.status === 'needs_review') {
        summary.needsReview.push(optSummary);
      } else if (dec.status === 'rejected') {
        summary.rejected.push(optSummary);
      } else {
        summary.undecided.push(optSummary);
      }
    }

    return summary;
  }

  /**
   * خلاصه تصمیمات کل حوزه‌ها برای صفحه جمع‌بندی
   */
  getAllSummary() {
    if (!window.HIRAMANA_PRESENTATION_DATA) return [];
    return window.HIRAMANA_PRESENTATION_DATA.domains.map(d => this.getDomainSummary(d.id));
  }
}

// نمونه واحد سراسری
window.stateManager = new StateManager();

