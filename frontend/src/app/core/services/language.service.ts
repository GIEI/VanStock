import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
  code:  string;
  label: string;
  flag:  string;
}

export const LANGUAGES: Language[] = [
  { code: 'it', label: 'Italiano',  flag: '🇮🇹' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'ru', label: 'Русский',   flag: '🇷🇺' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵' },
];

const STORAGE_KEY = 'ss_lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly languages = LANGUAGES;

  constructor(private translate: TranslateService) {}

  init(): void {
    const saved   = localStorage.getItem(STORAGE_KEY);
    const browser = navigator.language.slice(0, 2);
    const codes   = LANGUAGES.map(l => l.code);
    const lang    = saved && codes.includes(saved) ? saved
                  : codes.includes(browser)         ? browser
                  : 'it';

    this.translate.addLangs(codes);
    this.translate.setDefaultLang('it');
    this.translate.use(lang);
  }

  get current(): string {
    return this.translate.currentLang || 'it';
  }

  use(code: string): void {
    this.translate.use(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  get currentLanguage(): Language {
    return LANGUAGES.find(l => l.code === this.current) ?? LANGUAGES[0];
  }
}
