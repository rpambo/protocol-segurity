import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';

interface HeroSlide {
  kicker: string;
  overline: string;
  title: { text: string; accent?: boolean }[];
  description: string;
  visual: 'protocol' | 'media' | 'dress' | 'prophet';
  image: string;
  visualLabel: string;
  creditText?: string;
  creditUrl?: string;
  footer: string;
}

type CountryPreview = readonly [code: string, name: string];

interface LeaderSlide {
  name: string;
  role: string;
  image: string;
  imageAlt: string;
  illustration: boolean;
  creditText?: string;
  creditUrl?: string;
}

@Component({
  selector: 'app-public-home',
  imports: [RouterLink],
  templateUrl: './public-home.html',
  styleUrl: './public-home.css'
})
export class PublicHome implements OnInit, OnDestroy {
  @ViewChild('closingSection', { static: true })
  private closingSection!: ElementRef<HTMLElement>;
  @ViewChild('closingParallax', { static: true })
  private closingParallax!: ElementRef<HTMLElement>;

  protected activeSlide = 0;
  protected readonly leaderSlides: LeaderSlide[] = [
    {
      name: 'Prophet Uebert Angel',
      role: 'OUR FATHER',
      image: '/images/leader-illustrations/prophet-uebert-angel.png',
      imageAlt: 'Photograph of Prophet Uebert Angel',
      illustration: false,
      creditText: 'Photo: Straightshoot101 · CC BY-SA 4.0',
    },
    {
      name: 'Prophetess Beverly Angel',
      role: 'OUR MOTHER',
      image: '/images/leader-illustrations/prophetess-beverly-angel.png',
      imageAlt: 'Official portrait of Prophetess Beverly BeBe Angel',
      illustration: false
    },
    {
      name: 'Uebert Angel Jr. (The Seer)',
      role: 'CHAPLAIN SEER',
      image: '/images/leader-illustrations/chaplain-seer.png',
      imageAlt: 'Official portrait of Chaplain Seer',
      illustration: false
    },
    {
      name: 'Minister Levi Angel',
      role: 'MINISTER',
      image: '/images/leader-illustrations/minister-levi.png',
      imageAlt: 'Official portrait of Minister Levi (Levi Hanoch Angel)',
      illustration: false
    },
    {
      name: 'Chief Director Nyasha Zenda',
      role: 'CHIEF DIRECTOR',
      image: '/images/leader-illustrations/chief-director-nyasha-zenda.png',
      imageAlt: 'Official portrait of Chief Director Nyasha Zenda',
      illustration: false
    },
    {
      name: 'Director General Wise Angel',
      role: 'DIRECTOR GENERAL',
      image: '/images/leader-illustrations/director-general-wise-angel.png',
      imageAlt: 'Official portrait of Director General Wise Angel',
      illustration: false
    }
  ];
  protected readonly countryPreview: CountryPreview[] = [
    ['gb', 'United Kingdom'],
    ['us', 'United States'],
    ['za', 'South Africa'],
    ['zw', 'Zimbabwe'],
    ['bw', 'Botswana'],
    ['na', 'Namibia'],
    ['zm', 'Zambia'],
    ['ie', 'Ireland'],
    ['fr', 'France'],
    ['au', 'Australia'],
    ['de', 'Germany'],
    ['ao', 'Angola'],
    ['ca', 'Canada'],
    ['be', 'Belgium'],
    ['bi', 'Burundi'],
    ['fj', 'Fiji'],
    ['in', 'India'],
    ['mz', 'Mozambique'],
    ['ng', 'Nigeria'],
    ['rw', 'Rwanda'],
    ['tz', 'Tanzania'],
    ['ug', 'Uganda'],
    ['ke', 'Kenya'],
    ['pr', 'Puerto Rico']
  ];

  protected readonly slides: HeroSlide[] = [
    {
      kicker: 'SPIRIT EMBASSY · THE GOODNEWS CHURCH',
      overline: 'CHRIST AT THE CENTRE OF EVERY GATHERING.',
      title: [
        { text: 'Serving Christ.' },
        { text: 'Serving with excellence.', accent: true }
      ],
      description: 'Across every branch, Spirit Embassy protocol and security teams serve with order, vigilance and care—supporting worship, ministry and each gathering.',
      visual: 'protocol',
      image: '/images/hero-protocol-cc-by.png',
      visualLabel: 'Photograph of Pastor Rashad Cartwright in a black suit and tie',
      creditText: 'Photo: Rashad Cartwright · CC BY 4.0',
      footer: 'ORDER · VIGILANCE · SERVICE'
    },
    {
      kicker: 'PROTOCOL & SECURITY TRAINING',
      overline: 'PREPARE EACH TEAM. SERVE EACH BRANCH.',
      title: [
        { text: 'Learn the standard.' },
        { text: 'Serve with purpose.', accent: true }
      ],
      description: 'Access teachings, training videos, PDFs, images and practical guidance for protocol and security service at Spirit Embassy branches.',
      visual: 'media',
      image: '/images/hero-media.png',
      visualLabel: 'Close-up photograph of a microphone at a live event',
      footer: 'TEACHINGS · TRAINING · GUIDANCE'
    },
    {
      kicker: 'PRESENTATION & DRESS STANDARD',
      overline: 'ONE STANDARD. EVERY BRANCH.',
      title: [
        { text: 'Represent the' },
        { text: 'ministry with care.', accent: true }
      ],
      description: 'Check the dress standard for your protocol or security assignment, with guidance for global, regional and local services.',
      visual: 'dress',
      image: '/images/hero-dress-code.png',
      visualLabel: 'Photograph of clothing prepared for a formal gathering',
      footer: 'GLOBAL · REGIONAL · BRANCH'
    },
    {
      kicker: 'SPIRITUAL LEADERSHIP',
      overline: 'THE GOODNEWS WORLD',
      title: [
        { text: 'Prophet' },
        { text: 'Uebert Angel.', accent: true }
      ],
      description: 'Honouring Prophet Uebert Angel and the Christ-centred vision of the GoodNews World, served through Spirit Embassy branches across nations.',
      visual: 'prophet',
      image: '/images/prophet-uebert-angel.png',
      visualLabel: 'Photograph of Prophet Uebert Angel at a Spirit Embassy event',
      creditText: 'Photo: Straightshoot101 · CC BY-SA 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:New_Suit1.jpg',
      footer: 'CHRIST · VISION · SERVICE'
    }
  ];

  private slideTimer?: ReturnType<typeof setInterval>;
  private parallaxFrame: number | null = null;

  ngOnInit(): void {
    this.startSlideTimer();
    this.updateClosingParallax();
  }

  ngOnDestroy(): void {
    this.stopSlideTimer();
    if (this.parallaxFrame !== null) {
      cancelAnimationFrame(this.parallaxFrame);
    }
  }

  protected get currentSlide(): HeroSlide {
    return this.slides[this.activeSlide];
  }

  protected showSlide(index: number): void {
    this.activeSlide = (index + this.slides.length) % this.slides.length;
    this.restartSlideTimer();
  }

  protected pauseSlides(): void {
    this.stopSlideTimer();
  }

  protected resumeSlides(): void {
    this.startSlideTimer();
  }

  @HostListener('window:scroll')
  protected scheduleClosingParallax(): void {
    if (this.parallaxFrame !== null) {
      return;
    }

    this.parallaxFrame = requestAnimationFrame(() => {
      this.parallaxFrame = null;
      this.updateClosingParallax();
    });
  }

  @HostListener('window:resize')
  protected refreshClosingParallax(): void {
    this.scheduleClosingParallax();
  }

  private startSlideTimer(): void {
    this.stopSlideTimer();
    this.slideTimer = setInterval(() => {
      this.activeSlide = (this.activeSlide + 1) % this.slides.length;
    }, 6500);
  }

  private restartSlideTimer(): void {
    this.startSlideTimer();
  }

  private updateClosingParallax(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.closingParallax.nativeElement.style.transform = 'none';
      return;
    }

    const section = this.closingSection.nativeElement.getBoundingClientRect();
    const progress = (window.innerHeight - section.top) / (window.innerHeight + section.height);
    const offset = (progress - 0.5) * -80;
    this.closingParallax.nativeElement.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
  }

  private stopSlideTimer(): void {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = undefined;
    }
  }

}
