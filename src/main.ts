import './styles/main.css';
import {
  BLOOM_ORACLE_PETALS,
  CELEBRATION_LETTER,
  EDITORIAL_GALLERY,
  FLOWER_WISH_PAIRS,
  GLASS_WISH_PANELS,
  GREETING_CARDS,
  MARQUEE_BOTTOM,
  MARQUEE_TOP,
  WAX_SEAL_LETTER,
} from './data/content';
import { CloudFlowerStage } from './scene/CloudFlowerStage';
import { HeroPetalsOverlay } from './scene/HeroPetalsOverlay';
import { PetalCelebrationOverlay, exportMothersDayCardPNG } from './components/CelebrationCanvas';

const SCENE_CHAPTERS = [
  { id: 'hero-track', label: 'Цветочная роща' },
  { id: 'cloud-stage', label: '3D-пион в облаках' },
  { id: 'wax-envelope', label: 'Письмо в конверте' },
  { id: 'greetings', label: 'Десять открыток' },
  { id: 'petal-oracle', label: 'Цветок желаний' },
  { id: 'glass-wishes', label: 'Букет пожеланий' },
  { id: 'gallery', label: 'Галерея рощи' },
  { id: 'celebrate', label: 'Главное поздравление' },
];

function renderMarqueeItems(phrases: string[], cls: string): string {
  const chunk = phrases
    .map((text) => `<span class="${cls}">${text}</span><span class="marquee-dot" aria-hidden="true"></span>`)
    .join('');
  return `<div class="marquee-track">${chunk}</div><div class="marquee-track" aria-hidden="true">${chunk}</div>`;
}

function renderAppMarkup(): string {
  const firstPair = FLOWER_WISH_PAIRS[0];

  const oraclePetalsHtml = BLOOM_ORACLE_PETALS.map((p, idx) => {
    const angle = idx * (360 / BLOOM_ORACLE_PETALS.length);
    return `
      <button
        type="button"
        class="oracle-petal-btn"
        style="--petal-angle: ${angle}deg;"
        data-oracle-petal="${p.id}"
        aria-label="Сорвать лепесток «${p.shortLabel}»"
      >
        <span class="oracle-petal-text">${p.shortLabel}</span>
      </button>
    `;
  }).join('');

  const greetingCardsHtml = GREETING_CARDS.map(
    (card) => `
      <div class="flip-card-slot">
        <button
          type="button"
          class="flip-card-btn"
          data-flip-card="${card.id}"
          aria-pressed="false"
          aria-label="Открытка ${card.index}: ${card.title}. Нажмите, чтобы перевернуть и прочитать секретное пожелание."
        >
          <div class="flip-face flip-face--front">
            <div class="greeting-card-top">
              <span class="greeting-index">${card.index}</span>
              <span class="greeting-eyebrow">${card.eyebrow}</span>
            </div>
            <h3 class="greeting-title">${card.title}</h3>
            <p class="greeting-text">${card.text}</p>
            <div class="greeting-dedication">
              <span>${card.dedication}</span>
              <span aria-hidden="true">↻</span>
            </div>
          </div>
          <div class="flip-face flip-face--back">
            <div class="greeting-card-top">
              <span class="greeting-index">${card.index}</span>
              <span class="greeting-eyebrow">${card.secretTitle}</span>
            </div>
            <p class="secret-wish-quote">«${card.secretWish}»</p>
            <div class="greeting-dedication">
              <span>Люблю тебя, мама</span>
              <span aria-hidden="true">♥</span>
            </div>
          </div>
        </button>
      </div>
    `
  ).join('');

  const glassWishesHtml = GLASS_WISH_PANELS.map(
    (panel) => `
      <button
        type="button"
        class="glass-panel glass-wish-card"
        data-glass-wish="${panel.id}"
        data-specular
        aria-pressed="false"
      >
        <div class="glass-label-row">
          <span class="glass-label">${panel.label}</span>
          <span class="glass-heart-badge" aria-hidden="true">♡</span>
        </div>
        <div class="glass-metric">${panel.accent}</div>
        <h3 class="glass-title">${panel.title}</h3>
        <p class="glass-desc">${panel.description}</p>
        <span class="glass-tap-status" data-wish-status>Нажми, чтобы добавить в свой букет</span>
      </button>
    `
  ).join('');

  const galleryHtml = EDITORIAL_GALLERY.map(
    (item, idx) => `
      <button
        type="button"
        class="gallery-plate gallery-plate--${item.aspect}"
        data-gallery-index="${idx}"
        aria-label="Открыть фотографию «${item.title}» в полном размере"
      >
        <div class="gallery-image-frame">
          <img src="${item.src}" alt="${item.alt}" loading="lazy" decoding="async" />
          <span class="gallery-zoom-pill">Открыть</span>
        </div>
        <div class="gallery-meta">
          <span class="gallery-plate-num">${item.plate}</span>
          <h3 class="gallery-title">${item.title}</h3>
          <p class="gallery-caption">${item.caption}</p>
        </div>
      </button>
    `
  ).join('');

  const sceneDotsHtml = SCENE_CHAPTERS.map(
    (ch, idx) => `
      <button
        type="button"
        class="scene-dot ${idx === 0 ? 'is-active' : ''}"
        data-scene-target="${ch.id}"
        aria-label="Перейти к сцене: ${ch.label}"
        title="${ch.label}"
      ></button>
    `
  ).join('');

  return `
    <!-- Morphing White Serif Header -> Compact Floating Frosted Glass Pill "Max&Jane" -->
    <header class="dedication-bar" id="dedication-bar">
      <a href="#top" class="dedication-surface" id="dedication-surface" aria-label="Вернуться в начало страницы">
        <span class="pill-dot" aria-hidden="true"></span>
        <span class="dedication-text">
          <span class="dedication-prefix">Мама, поздравляю тебя от</span>
          <em class="dedication-brand">Max&amp;Jane</em>
        </span>
        <div class="page-scroll-progress" aria-hidden="true"></div>
      </a>
    </header>

    <!-- Minimal Chapter Dots on Right Edge -->
    <nav class="scene-rail-dots" id="scene-rail-dots" aria-label="Сцены поздравления">
      ${sceneDotsHtml}
    </nav>

    <main id="top">
      <!-- SCENE 0: HERO 3D FLORAL GROVE + SEAMLESS SUNLIT FLASH -->
      <section class="hero-dissolve-track" id="hero-track" aria-label="Цветочная роща из роз и пионов для мамы">
        <div class="hero-sticky-viewport" id="hero-viewport">
          <div class="hero-media-layer">
            <video
              id="hero-video"
              class="hero-video"
              autoplay
              muted
              loop
              playsinline
              preload="auto"
              poster="./media/floral-grove-poster.jpg"
            >
              <source src="./media/floral-grove.webm" type="video/webm" />
              <source src="./media/floral-grove.mp4" type="video/mp4" />
            </video>
            <div class="hero-scrim"></div>
          </div>

          <div class="hero-editorial-content">
            <div class="hero-kicker">Для самой любимой мамы · С Днём Матери</div>
            <h1 class="hero-title">
              С Днём Матери, мама
              <em>в цветущей роще роз и пионов</em>
            </h1>
            <p class="hero-subtitle">
              Этот сад из нежных роз, пионов и тёплых слов я дарю тебе — листай, крути 3D-цветок, раскрывай конверт и срывай лепестки пожеланий.
            </p>
            <a href="#cloud-stage" class="hero-scroll-cue">
              <span>Листай вниз сквозь солнечный свет</span>
              <span class="hero-scroll-line" aria-hidden="true"></span>
            </a>
          </div>

          <div class="bright-dissolve-veil" aria-hidden="true"></div>
          <div class="bright-dissolve-flare" aria-hidden="true"></div>
        </div>
      </section>

      <!-- CINEMATIC STICKY-DECK STORY SCENES -->
      <div class="story-deck" id="story-deck">
        <!-- SCENE 1: INTERACTIVE CLOUD 3D FLOWER STAGE -->
        <section
          class="story-scene cloud-stage-section"
          id="cloud-stage"
          data-story-scene
          data-scene-idx="1"
          aria-labelledby="cloud-stage-heading"
        >
          <div class="story-scene-inner">
            <div class="section-container">
              <header class="section-header reveal-up">
                <p class="section-eyebrow">Покрути 3D-цветок или нажми на него</p>
                <h2 class="section-title" id="cloud-stage-heading">
                  Пион в облаках <em>и пожелания для тебя</em>
                </h2>
                <p class="section-lead">
                  Поворачивай бутон мышкой, пальцем или стрелками клавиатуры — с каждым поворотом вокруг расцветают новые тёплые слова для тебя, мамочка.
                </p>
              </header>

              <div class="cloud-stage-grid">
                <button
                  type="button"
                  class="glass-panel stage-wish-panel reveal-up"
                  id="left-wish-panel"
                  data-specular
                  aria-live="polite"
                  title="Нажмите, чтобы увидеть следующее пожелание"
                >
                  <div class="wish-panel-header">
                    <span id="left-wish-tag">${firstPair.leftTag}</span>
                    <span class="wish-next-chip">Ещё ↻</span>
                  </div>
                  <h3 class="stage-panel-title" id="left-wish-title">${firstPair.leftTitle}</h3>
                  <p class="stage-panel-body" id="left-wish-body">${firstPair.leftBody}</p>
                  <span class="stage-panel-sign" id="left-wish-sign">${firstPair.leftSign}</span>
                </button>

                <div
                  class="cloud-canvas-shell"
                  id="cloud-canvas-shell"
                  tabindex="0"
                  role="region"
                  aria-label="Интерактивный 3D-цветок пион-роза в облаках. Покрутите цветок перетаскиванием, стрелками клавиатуры или нажмите на него."
                >
                  <div class="cloud-loader" id="cloud-loader">
                    <span class="cloud-loader-ring" aria-hidden="true"></span>
                    <span>Раскрываю бутон для тебя…</span>
                  </div>
                </div>

                <button
                  type="button"
                  class="glass-panel stage-wish-panel reveal-up"
                  id="right-wish-panel"
                  data-specular
                  aria-live="polite"
                  title="Нажмите, чтобы увидеть следующее пожелание"
                >
                  <div class="wish-panel-header">
                    <span id="right-wish-tag">${firstPair.rightTag}</span>
                    <span class="wish-next-chip">Ещё ↻</span>
                  </div>
                  <h3 class="stage-panel-title" id="right-wish-title">${firstPair.rightTitle}</h3>
                  <p class="stage-panel-body" id="right-wish-body">${firstPair.rightBody}</p>
                  <span class="stage-panel-sign" id="right-wish-sign">${firstPair.rightSign}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- SCENE 2: KINETIC RIBBONS + INTERACTIVE 3D WAX-SEAL ENVELOPE -->
        <section
          class="story-scene envelope-scene"
          id="wax-envelope"
          data-story-scene
          data-scene-idx="2"
          aria-labelledby="envelope-heading"
        >
          <div class="story-scene-inner">
            <div class="kinetic-marquee-band" aria-hidden="true">
              <div class="marquee-row marquee-row--top">
                ${renderMarqueeItems(MARQUEE_TOP, 'marquee-phrase-serif')}
              </div>
              <div class="marquee-row marquee-row--bottom">
                ${renderMarqueeItems(MARQUEE_BOTTOM, 'marquee-phrase-sans')}
              </div>
            </div>

            <div class="section-container">
              <header class="section-header reveal-up">
                <p class="section-eyebrow">${WAX_SEAL_LETTER.eyebrow}</p>
                <h2 class="section-title" id="envelope-heading">
                  Письмо, которое <em>ждёт тебя внутри</em>
                </h2>
                <p class="section-lead">
                  Нажми на розовую сургучную печать, чтобы распечатать конверт и прочитать несколько тёплых строк от меня.
                </p>
              </header>

              <div class="envelope-stage reveal-up">
                <div class="wax-envelope-wrap">
                  <div class="envelope-shell" id="envelope-shell">
                    <div class="envelope-flap" aria-hidden="true"></div>
                    <div class="envelope-pocket" aria-hidden="true"></div>

                    <button
                      type="button"
                      class="wax-seal-btn"
                      id="wax-seal-btn"
                      aria-expanded="false"
                      aria-controls="envelope-letter-sheet"
                      aria-label="Открыть конверт с письмом для мамы"
                    >
                      <span class="wax-seal-heart" aria-hidden="true">♥</span>
                      <span class="wax-seal-label">Открыть</span>
                    </button>

                    <div class="envelope-closed-caption">${WAX_SEAL_LETTER.envelopeCaption}</div>

                    <article class="envelope-letter-sheet" id="envelope-letter-sheet">
                      <p class="letter-salutation">${WAX_SEAL_LETTER.salutation}</p>
                      <div class="letter-body">
                        ${WAX_SEAL_LETTER.paragraphs.map((p) => `<p>${p}</p>`).join('')}
                      </div>
                      <div class="letter-footer-row">
                        <span class="letter-closing">${WAX_SEAL_LETTER.closing}</span>
                        <button type="button" class="btn-secondary-soft" id="envelope-close-btn">Сложить конверт</button>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SCENE 3: HORIZONTAL 10 FLIPPABLE GREETING CARDS -->
        <section
          class="story-scene greetings-section"
          id="greetings"
          data-story-scene
          data-scene-idx="3"
          aria-labelledby="greetings-heading"
        >
          <div class="story-scene-inner">
            <div class="section-container">
              <div class="rail-topbar reveal-up">
                <header class="section-header">
                  <p class="section-eyebrow">Горизонтальная лента открыток · Нажимай и переворачивай</p>
                  <h2 class="section-title" id="greetings-heading">
                    Десять тёплых открыток <em>для тебя, мама</em>
                  </h2>
                  <p class="section-lead">
                    Листай открытки вбок и нажимай на каждую, чтобы перевернуть её в 3D и прочитать спрятанное секретное P.S.
                  </p>
                </header>

                <div class="rail-controls">
                  <span class="rail-counter-pill" id="flipped-counter">
                    Открыто секретов: <strong>0</strong> / ${GREETING_CARDS.length}
                  </span>
                  <button type="button" class="rail-arrow-btn" data-rail-prev="greetings-rail" aria-label="Прокрутить открытки влево">←</button>
                  <button type="button" class="rail-arrow-btn" data-rail-next="greetings-rail" aria-label="Прокрутить открытки вправо">→</button>
                </div>
              </div>
            </div>

            <div class="h-scroll-rail" id="greetings-rail" data-drag-rail>
              ${greetingCardsHtml}
            </div>

            <div class="rail-progress-wrap">
              <div class="rail-progress-track">
                <div class="rail-progress-bar" data-rail-progress="greetings-rail"></div>
              </div>
              <span class="rail-swipe-hint">Тяни вбок или листай стрелками</span>
            </div>
          </div>
        </section>

        <!-- SCENE 4: INTERACTIVE 8-PETAL BLOOM ORACLE -->
        <section
          class="story-scene oracle-section"
          id="petal-oracle"
          data-story-scene
          data-scene-idx="4"
          aria-labelledby="oracle-heading"
        >
          <div class="story-scene-inner">
            <div class="section-container">
              <header class="section-header reveal-up">
                <p class="section-eyebrow">Интерактивный цветок желаний</p>
                <h2 class="section-title" id="oracle-heading">
                  Сорви лепесток <em>на удачу и радость</em>
                </h2>
                <p class="section-lead">
                  Нажми на любой лепесток цветка — он взлетит вверх и откроет тёплое пожелание для тебя на этот год.
                </p>
              </header>

              <div class="oracle-layout">
                <div class="bloom-wheel-stage reveal-up" id="bloom-wheel">
                  <div class="bloom-halo" aria-hidden="true"></div>
                  ${oraclePetalsHtml}
                  <button
                    type="button"
                    class="bloom-center-core"
                    id="oracle-reset-core"
                    title="Распустить все лепестки заново"
                  >
                    <span>Заново</span>
                    <span aria-hidden="true">✿</span>
                  </button>
                </div>

                <div class="glass-panel oracle-card reveal-up" id="oracle-card" data-specular aria-live="polite">
                  <div class="wish-panel-header">
                    <span id="oracle-counter-label">Сорвано лепестков: 0 / ${BLOOM_ORACLE_PETALS.length}</span>
                    <button type="button" class="wish-next-chip" id="oracle-reset-btn">Распустить заново ✿</button>
                  </div>
                  <h3 class="stage-panel-title" id="oracle-wish-title">Выбери любой лепесток на цветке</h3>
                  <p class="stage-panel-body" id="oracle-wish-body">
                    Под каждым из восьми шёлковых лепестков спрятано отдельное пожелание для тебя, мамочка. Сорви первый лепесток и посмотри, что он принесёт!
                  </p>
                  <div class="oracle-history-chips" id="oracle-history-chips"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SCENE 5: HORIZONTAL COLLECTIBLE GLASS WISH PANELS -->
        <section
          class="story-scene glass-band-section"
          id="glass-wishes"
          data-story-scene
          data-scene-idx="5"
          aria-labelledby="glass-wishes-heading"
        >
          <div class="story-scene-inner">
            <div class="section-container">
              <div class="rail-topbar reveal-up">
                <header class="section-header">
                  <p class="section-eyebrow">Стеклянные панели пожеланий · Интерактив</p>
                  <h2 class="section-title" id="glass-wishes-heading">
                    Собери свой <em>букет пожеланий</em>
                  </h2>
                  <p class="section-lead">
                    Нажимай на стеклянные карточки, чтобы зажечь каждое пожелание и добавить его в праздничный букет.
                  </p>
                </header>

                <div class="rail-controls">
                  <span class="rail-counter-pill" id="bouquet-counter">
                    В букете: <strong>0</strong> / ${GLASS_WISH_PANELS.length}
                  </span>
                  <button type="button" class="rail-arrow-btn" data-rail-prev="glass-rail" aria-label="Прокрутить пожелания влево">←</button>
                  <button type="button" class="rail-arrow-btn" data-rail-next="glass-rail" aria-label="Прокрутить пожелания вправо">→</button>
                </div>
              </div>
            </div>

            <div class="h-scroll-rail" id="glass-rail" data-drag-rail>
              ${glassWishesHtml}
            </div>

            <div class="rail-progress-wrap">
              <div class="rail-progress-track">
                <div class="rail-progress-bar" data-rail-progress="glass-rail"></div>
              </div>
              <span class="rail-swipe-hint">Листай вбок и зажигай карточки</span>
            </div>
          </div>
        </section>

        <!-- SCENE 6: HORIZONTAL 6-PLATE EDITORIAL GALLERY -->
        <section
          class="story-scene gallery-section"
          id="gallery"
          data-story-scene
          data-scene-idx="6"
          aria-labelledby="gallery-heading"
        >
          <div class="story-scene-inner">
            <div class="section-container">
              <div class="rail-topbar reveal-up">
                <header class="section-header">
                  <p class="section-eyebrow">Редакционная галерея · 6 кадров рощи</p>
                  <h2 class="section-title" id="gallery-heading">
                    Мгновения <em>твоей цветочной рощи</em>
                  </h2>
                  <p class="section-lead">
                    Пролистай все шесть кадров вправо и нажми на любую фотографию, чтобы открыть её крупно с личной запиской для тебя.
                  </p>
                </header>

                <div class="rail-controls">
                  <button type="button" class="rail-arrow-btn" data-rail-prev="gallery-rail" aria-label="Прокрутить галерею влево">←</button>
                  <button type="button" class="rail-arrow-btn" data-rail-next="gallery-rail" aria-label="Прокрутить галерею вправо">→</button>
                </div>
              </div>
            </div>

            <div class="h-scroll-rail gallery-rail" id="gallery-rail" data-drag-rail>
              ${galleryHtml}
            </div>

            <div class="rail-progress-wrap">
              <div class="rail-progress-track">
                <div class="rail-progress-bar" data-rail-progress="gallery-rail"></div>
              </div>
              <span class="rail-swipe-hint">Нажми на кадр, чтобы открыть письмо</span>
            </div>
          </div>
        </section>

        <!-- SCENE 7: HORSESHOE FLORAL ARCH FOOTER & CTA -->
        <footer
          class="story-scene horseshoe-footer"
          id="celebrate"
          data-story-scene
          data-scene-idx="7"
        >
          <div class="story-scene-inner">
            <div class="horseshoe-stage">
              <div class="horseshoe-arch-backdrop" aria-hidden="true">
                <img
                  src="./images/horseshoe-floral-arch.jpg"
                  alt=""
                  class="horseshoe-arch-img"
                  loading="lazy"
                  decoding="async"
                />
                <div class="horseshoe-center-halo"></div>
              </div>

              <div class="horseshoe-content reveal-up">
                <p class="horseshoe-eyebrow">Под сводом роз и пионов · Для тебя, мама</p>
                <h2 class="horseshoe-title">Открой главное поздравление</h2>
                <p class="horseshoe-lead">
                  Нажми на кнопку, чтобы запустить праздничный дождь из лепестков и открыть моё личное поздравление для тебя.
                </p>
                <button type="button" class="celebrate-cta-btn" id="celebrate-btn">
                  <span>Поздравление с Днём Матери</span>
                </button>
              </div>
            </div>

            <div class="footer-colophon">
              <span class="footer-colophon-serif">Мама, поздравляю тебя от Max&amp;Jane</span>
              <span>С любовью и нежностью · С Днём Матери</span>
            </div>
          </div>
        </footer>
      </div>
    </main>

    <!-- Anytime Floating Petal Shower Button -->
    <button
      type="button"
      class="floating-petal-fab"
      id="floating-petal-fab"
      aria-label="Запустить дождь из лепестков роз и пионов"
      title="Посыпать лепестками роз и пионов"
    >
      <span aria-hidden="true">✿</span>
      <span>Посыпать лепестками</span>
    </button>

    <!-- PERSONAL CELEBRATION LETTER MODAL FOR MOM -->
    <div
      class="modal-backdrop"
      id="celebration-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-modal-title"
      aria-hidden="true"
    >
      <div class="modal-card">
        <button type="button" class="modal-close" id="celebration-close" aria-label="Закрыть открытку">×</button>
        <p class="section-eyebrow">${CELEBRATION_LETTER.eyebrow}</p>
        <h2 class="modal-title" id="celebration-modal-title">${CELEBRATION_LETTER.title}</h2>
        <div class="modal-ornament" aria-hidden="true"></div>
        <p class="modal-lead">${CELEBRATION_LETTER.lead}</p>
        <div class="modal-paragraphs">
          ${CELEBRATION_LETTER.paragraphs.map((p) => `<p>${p}</p>`).join('')}
        </div>
        <p class="modal-signature">${CELEBRATION_LETTER.signature}</p>
        <div class="modal-actions">
          <button type="button" class="btn-primary-soft" id="download-card-btn">Сохранить открытку (PNG)</button>
          <button type="button" class="btn-secondary-soft" id="copy-link-btn">Скопировать ссылку</button>
          <button type="button" class="btn-secondary-soft" id="more-petals-btn">Ещё лепестков</button>
        </div>
      </div>
    </div>

    <!-- EDITORIAL GALLERY LIGHTBOX MODAL -->
    <div
      class="modal-backdrop"
      id="lightbox-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      aria-hidden="true"
    >
      <div class="modal-card lightbox-card">
        <button type="button" class="modal-close" id="lightbox-close" aria-label="Закрыть просмотр">×</button>
        <div class="lightbox-img-wrap">
          <img id="lightbox-img" src="" alt="" />
        </div>
        <div>
          <p class="section-eyebrow" id="lightbox-plate"></p>
          <h3 class="stage-panel-title" id="lightbox-title" style="margin-bottom: 0.75rem;"></h3>
          <p class="stage-panel-body" id="lightbox-essay"></p>
          <div class="lightbox-nav">
            <button type="button" class="btn-secondary-soft" id="lightbox-prev" aria-label="Предыдущая фотография">← Назад</button>
            <button type="button" class="btn-secondary-soft" id="lightbox-next" aria-label="Следующая фотография">Далее →</button>
          </div>
        </div>
      </div>
    </div>

    <div class="toast-banner" id="toast-banner" role="status" aria-live="polite"></div>
  `;
}

function wireHorizontalRail(rail: HTMLElement): void {
  const railId = rail.id;
  const progressBar = document.querySelector<HTMLElement>(`[data-rail-progress="${railId}"]`);
  const prevBtn = document.querySelector<HTMLButtonElement>(`[data-rail-prev="${railId}"]`);
  const nextBtn = document.querySelector<HTMLButtonElement>(`[data-rail-next="${railId}"]`);

  const updateProgress = (): void => {
    if (!progressBar) return;
    const maxScroll = Math.max(rail.scrollWidth - rail.clientWidth, 1);
    const ratio = Math.min(Math.max(rail.scrollLeft / maxScroll, 0), 1);
    const visiblePct = Math.max(18, Math.min(100, (rail.clientWidth / Math.max(rail.scrollWidth, 1)) * 100));
    const widthPct = visiblePct + (100 - visiblePct) * ratio;
    progressBar.style.width = `${widthPct.toFixed(1)}%`;
  };

  rail.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();

  const stepAmount = (): number => Math.max(300, Math.round(rail.clientWidth * 0.68));
  prevBtn?.addEventListener('click', () => {
    rail.scrollBy({ left: -stepAmount(), behavior: 'smooth' });
  });
  nextBtn?.addEventListener('click', () => {
    rail.scrollBy({ left: stepAmount(), behavior: 'smooth' });
  });

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  rail.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    dragged = false;
    startX = e.pageX;
    startScrollLeft = rail.scrollLeft;
    rail.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 7) dragged = true;
    if (dragged) {
      e.preventDefault();
      rail.scrollLeft = startScrollLeft - dx * 1.15;
    }
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    rail.classList.remove('is-dragging');
  });

  rail.addEventListener(
    'click',
    (e) => {
      if (dragged) {
        e.preventDefault();
        e.stopPropagation();
        dragged = false;
      }
    },
    true
  );
}

function wireSpecularGlassGlow(): void {
  document.querySelectorAll<HTMLElement>('[data-specular]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
      const y = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
      el.style.setProperty('--mx', `${x.toFixed(1)}%`);
      el.style.setProperty('--my', `${y.toFixed(1)}%`);
    });
  });
}

function initApp(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;
  appRoot.innerHTML = renderAppMarkup();

  const osReducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isReducedMotion = (): boolean => osReducedQuery.matches;

  const heroVideo = document.getElementById('hero-video') as HTMLVideoElement | null;
  const heroViewport = document.getElementById('hero-viewport') as HTMLElement;
  const heroTrack = document.getElementById('hero-track') as HTMLElement;
  const dedicationBar = document.getElementById('dedication-bar') as HTMLElement;
  const sceneDotsNav = document.getElementById('scene-rail-dots') as HTMLElement;
  const sceneDotBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-scene-target]'));
  const storyScenes = Array.from(document.querySelectorAll<HTMLElement>('[data-story-scene]'));
  const cloudShell = document.getElementById('cloud-canvas-shell') as HTMLElement;
  const cloudLoader = document.getElementById('cloud-loader') as HTMLElement;

  const heroPetals = new HeroPetalsOverlay(heroViewport);
  const celebrationPetals = new PetalCelebrationOverlay();

  wireSpecularGlassGlow();

  // Compute safe sticky top offsets for scenes taller than 100vh so content is NEVER cut off on short viewports
  const updateStickyOffsets = (): void => {
    const vh = window.innerHeight || 800;
    for (const scene of storyScenes) {
      if (scene.dataset.sceneIdx === '7') continue;
      const overflow = scene.offsetHeight - vh;
      const topVal = overflow > 0 ? -overflow : 0;
      scene.style.setProperty('--scene-sticky-top', `${Math.round(topVal)}px`);
    }
  };
  const stickyResizeObserver = new ResizeObserver(updateStickyOffsets);
  storyScenes.forEach((s) => stickyResizeObserver.observe(s));
  updateStickyOffsets();

  // Chapter dot navigation (scroll smoothly to natural offset of each scene)
  sceneDotBtns.forEach((dot) => {
    dot.addEventListener('click', () => {
      const targetId = dot.dataset.sceneTarget;
      if (!targetId) return;
      if (targetId === 'hero-track') {
        window.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      const target = document.getElementById(targetId);
      if (target) {
        // Compute static flow top even when sticky
        const prevPos = target.style.position;
        target.style.position = 'static';
        const topY = target.getBoundingClientRect().top + window.scrollY;
        target.style.position = prevPos;
        window.scrollTo({ top: topY, behavior: isReducedMotion() ? 'auto' : 'smooth' });
      }
    });
  });

  // Dual personal wish panels flanking the 3D Peony-Rose
  const leftPanelEl = document.getElementById('left-wish-panel')!;
  const rightPanelEl = document.getElementById('right-wish-panel')!;
  const leftTag = document.getElementById('left-wish-tag')!;
  const leftTitle = document.getElementById('left-wish-title')!;
  const leftBody = document.getElementById('left-wish-body')!;
  const leftSign = document.getElementById('left-wish-sign')!;
  const rightTag = document.getElementById('right-wish-tag')!;
  const rightTitle = document.getElementById('right-wish-title')!;
  const rightBody = document.getElementById('right-wish-body')!;
  const rightSign = document.getElementById('right-wish-sign')!;

  let activePairIdx = 0;

  const pulseWishSwap = (el: HTMLElement): void => {
    el.classList.remove('is-swapping');
    void el.offsetWidth;
    el.classList.add('is-swapping');
  };

  const renderWishPair = (idx: number): void => {
    const normalized = ((idx % FLOWER_WISH_PAIRS.length) + FLOWER_WISH_PAIRS.length) % FLOWER_WISH_PAIRS.length;
    if (normalized === activePairIdx) return;
    activePairIdx = normalized;
    const pair = FLOWER_WISH_PAIRS[normalized];
    leftTag.textContent = pair.leftTag;
    leftTitle.textContent = pair.leftTitle;
    leftBody.textContent = pair.leftBody;
    leftSign.textContent = pair.leftSign;
    rightTag.textContent = pair.rightTag;
    rightTitle.textContent = pair.rightTitle;
    rightBody.textContent = pair.rightBody;
    rightSign.textContent = pair.rightSign;
    pulseWishSwap(leftPanelEl);
    pulseWishSwap(rightPanelEl);
  };

  const cloudStage = new CloudFlowerStage(cloudShell, {
    onModelLoaded: () => {
      cloudLoader.classList.add('is-hidden');
    },
    onInteractionStateChange: (isDragging) => {
      cloudShell.classList.toggle('is-dragging', isDragging);
    },
    onAngleChange: (_yawDeg, _pitchDeg, facetIdx) => {
      renderWishPair(facetIdx);
    },
    onFlowerTap: (x, y) => {
      celebrationPetals.launchMiniBurst(x, y, isReducedMotion());
    },
  });

  const advanceFlowerWish = (e: MouseEvent): void => {
    cloudStage.rotateToFacet(activePairIdx + 1);
    celebrationPetals.launchMiniBurst(e.clientX, e.clientY, isReducedMotion());
  };
  leftPanelEl.addEventListener('click', advanceFlowerWish);
  rightPanelEl.addEventListener('click', advanceFlowerWish);

  // Unified Scroll Orchestrator:
  // 1) Header morph into compact floating glass pill "Max&Jane"
  // 2) Hero -> Sunlit Bright Flash -> Cloud 3D Stage
  // 3) Cinematic Sticky-Deck Scene-by-Scene transitions (--scene-enter & --scene-exit)
  // 4) Active chapter dot sync
  let scrollRafPending = false;
  const updateScrollEffects = (): void => {
    scrollRafPending = false;
    const scrollY = window.scrollY;
    const vh = Math.max(window.innerHeight, 1);
    const docMax = Math.max(document.documentElement.scrollHeight - vh, 1);
    const pageProgress = Math.min(Math.max(scrollY / docMax, 0), 1);

    document.documentElement.style.setProperty('--scroll-page', pageProgress.toFixed(4));

    // Morph top dedication strip into compact floating glass pill "Max&Jane"
    const shouldBePill = scrollY > 42;
    dedicationBar.classList.toggle('is-pill', shouldBePill);
    sceneDotsNav.classList.toggle('is-visible', scrollY > vh * 0.25);

    if (isReducedMotion()) {
      document.documentElement.style.setProperty('--dissolve-progress', '0');
      document.documentElement.style.setProperty('--bloom-intensity', '0');
      document.documentElement.style.setProperty('--hero-zoom', '1');
      document.documentElement.style.setProperty('--hero-fade', '1');
      document.documentElement.style.setProperty('--cloud-fade', '1');
      storyScenes.forEach((s) => {
        s.style.setProperty('--scene-enter', '1');
        s.style.setProperty('--scene-exit', '0');
      });
      cloudStage.setScrollReveal(1);
      return;
    }

    // Hero -> Sunlit Flash -> Cloud 3D Stage
    const trackRect = heroTrack.getBoundingClientRect();
    const scrollableDistance = Math.max(heroTrack.offsetHeight - vh, 1);
    const p = Math.min(Math.max(-trackRect.top / scrollableDistance, 0), 1);

    const heroFade = Math.max(0, 1 - p * 2.15);
    const flashIn = Math.min(Math.max((p - 0.1) / 0.52, 0), 1);
    const flashEased = flashIn * flashIn * (3 - 2 * flashIn);
    const heroZoom = 1 + p * 0.11;
    const cloudFade = Math.min(Math.max((p - 0.5) / 0.48, 0), 1);

    document.documentElement.style.setProperty('--dissolve-progress', p.toFixed(4));
    document.documentElement.style.setProperty('--bloom-intensity', flashEased.toFixed(4));
    document.documentElement.style.setProperty('--hero-zoom', heroZoom.toFixed(4));
    document.documentElement.style.setProperty('--hero-fade', heroFade.toFixed(4));
    document.documentElement.style.setProperty('--cloud-fade', Math.max(cloudFade, 0.08).toFixed(4));
    cloudStage.setScrollReveal(cloudFade);

    // Sticky-Deck Curtain Transitions across every chapter
    let activeChapterIdx = scrollY < vh * 0.35 ? 0 : 1;

    for (let i = 0; i < storyScenes.length; i++) {
      const current = storyScenes[i];
      const next = storyScenes[i + 1];
      const rect = current.getBoundingClientRect();

      // Entrance curve as this scene rises from bottom of viewport to top
      const enterRaw = 1 - Math.min(Math.max(rect.top / vh, 0), 1);
      const enterEased = enterRaw * enterRaw * (3 - 2 * enterRaw);
      current.style.setProperty('--scene-enter', enterEased.toFixed(4));

      if (rect.top <= vh * 0.42) {
        activeChapterIdx = i + 1;
      }

      // Exit depth recession as the NEXT scene glides up over this sticky scene
      if (next) {
        const nextRect = next.getBoundingClientRect();
        const coverRaw = 1 - Math.min(Math.max(nextRect.top / vh, 0), 1);
        const coverEased = coverRaw * coverRaw * (3 - 2 * coverRaw);
        current.style.setProperty('--scene-exit', coverEased.toFixed(4));
      } else {
        current.style.setProperty('--scene-exit', '0');
      }
    }

    sceneDotBtns.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === activeChapterIdx);
    });
  };

  const requestScrollUpdate = (): void => {
    if (!scrollRafPending) {
      scrollRafPending = true;
      requestAnimationFrame(updateScrollEffects);
    }
  };

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', () => {
    updateStickyOffsets();
    requestScrollUpdate();
  }, { passive: true });
  updateScrollEffects();

  // Interactive 3D Wax-Seal Envelope Letter
  const envelopeShell = document.getElementById('envelope-shell') as HTMLElement;
  const waxSealBtn = document.getElementById('wax-seal-btn') as HTMLButtonElement;
  const envelopeCloseBtn = document.getElementById('envelope-close-btn') as HTMLButtonElement;

  const setEnvelopeOpen = (open: boolean, clientX?: number, clientY?: number): void => {
    envelopeShell.classList.toggle('is-open', open);
    waxSealBtn.setAttribute('aria-expanded', String(open));
    window.setTimeout(updateStickyOffsets, 450);
    if (open) {
      const rect = waxSealBtn.getBoundingClientRect();
      celebrationPetals.launchMiniBurst(
        clientX || rect.left + rect.width * 0.5,
        clientY || rect.top + rect.height * 0.5,
        isReducedMotion()
      );
    }
  };

  waxSealBtn.addEventListener('click', (e) => setEnvelopeOpen(true, e.clientX, e.clientY));
  envelopeCloseBtn.addEventListener('click', () => setEnvelopeOpen(false));

  // Interactive 8-Petal Bloom Oracle
  const pluckedPetals = new Set<number>();
  const oracleCardEl = document.getElementById('oracle-card')!;
  const oracleCounterEl = document.getElementById('oracle-counter-label')!;
  const oracleTitleEl = document.getElementById('oracle-wish-title')!;
  const oracleBodyEl = document.getElementById('oracle-wish-body')!;
  const oracleChipsEl = document.getElementById('oracle-history-chips')!;
  const oraclePetalBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-oracle-petal]'));

  const resetOracleBloom = (): void => {
    pluckedPetals.clear();
    oraclePetalBtns.forEach((b) => b.classList.remove('is-plucked'));
    oracleCounterEl.textContent = `Сорвано лепестков: 0 / ${BLOOM_ORACLE_PETALS.length}`;
    oracleTitleEl.textContent = 'Цветок снова распустился!';
    oracleBodyEl.textContent = 'Нажми на любой лепесток, чтобы открыть новое пожелание на этот год.';
    oracleChipsEl.innerHTML = '';
    pulseWishSwap(oracleCardEl);
  };

  oraclePetalBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = Number(btn.dataset.oraclePetal || 0);
      if (pluckedPetals.has(id)) return;
      const item = BLOOM_ORACLE_PETALS.find((p) => p.id === id);
      if (!item) return;

      pluckedPetals.add(id);
      btn.classList.add('is-plucked');
      oracleCounterEl.textContent = `Сорвано лепестков: ${pluckedPetals.size} / ${BLOOM_ORACLE_PETALS.length}`;
      oracleTitleEl.textContent = item.title;
      oracleBodyEl.textContent = item.wish;
      pulseWishSwap(oracleCardEl);

      const chip = document.createElement('span');
      chip.className = 'oracle-chip';
      chip.textContent = `${item.shortLabel} ✿`;
      oracleChipsEl.appendChild(chip);

      const rect = btn.getBoundingClientRect();
      celebrationPetals.launchMiniBurst(
        e.clientX || rect.left + rect.width * 0.5,
        e.clientY || rect.top + rect.height * 0.5,
        isReducedMotion()
      );

      if (pluckedPetals.size === BLOOM_ORACLE_PETALS.length) {
        celebrationPetals.launchShower(isReducedMotion());
        showToast('Все 8 лепестков пожеланий открыты — пусть всё сбудется, мама!');
      }
    });
  });

  document.getElementById('oracle-reset-btn')?.addEventListener('click', resetOracleBloom);
  document.getElementById('oracle-reset-core')?.addEventListener('click', resetOracleBloom);

  // Wire all 3 Horizontal Scroll Rails
  document.querySelectorAll<HTMLElement>('[data-drag-rail]').forEach(wireHorizontalRail);

  // Interactive 3D Flippable Greeting Cards
  const flippedIds = new Set<string>();
  const flippedCounterEl = document.getElementById('flipped-counter')!;
  document.querySelectorAll<HTMLButtonElement>('[data-flip-card]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.flipCard!;
      const nowFlipped = !btn.classList.contains('is-flipped');
      btn.classList.toggle('is-flipped', nowFlipped);
      btn.setAttribute('aria-pressed', String(nowFlipped));

      if (nowFlipped) {
        const rect = btn.getBoundingClientRect();
        celebrationPetals.launchMiniBurst(
          e.clientX || rect.left + rect.width * 0.5,
          e.clientY || rect.top + rect.height * 0.5,
          isReducedMotion()
        );

        if (!flippedIds.has(id)) {
          flippedIds.add(id);
          flippedCounterEl.innerHTML = `Открыто секретов: <strong>${flippedIds.size}</strong> / ${GREETING_CARDS.length}`;
          if (flippedIds.size === GREETING_CARDS.length) {
            celebrationPetals.launchShower(isReducedMotion());
            showToast('Мама, ты открыла все 10 секретных пожеланий!');
          }
        }
      }
    });
  });

  // Interactive Collectible Glass Wish Panels
  const collectedWishes = new Set<string>();
  const bouquetCounterEl = document.getElementById('bouquet-counter')!;
  document.querySelectorAll<HTMLButtonElement>('[data-glass-wish]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.glassWish!;
      const already = collectedWishes.has(id);
      const badge = btn.querySelector<HTMLElement>('.glass-heart-badge');
      const status = btn.querySelector<HTMLElement>('[data-wish-status]');

      if (already) {
        collectedWishes.delete(id);
        btn.classList.remove('is-collected');
        btn.setAttribute('aria-pressed', 'false');
        if (badge) badge.textContent = '♡';
        if (status) status.textContent = 'Нажми, чтобы добавить в свой букет';
      } else {
        collectedWishes.add(id);
        btn.classList.add('is-collected');
        btn.setAttribute('aria-pressed', 'true');
        if (badge) badge.textContent = '♥';
        if (status) status.textContent = 'Пожелание собрано в твой букет ♥';
        const rect = btn.getBoundingClientRect();
        celebrationPetals.launchMiniBurst(
          e.clientX || rect.left + rect.width * 0.5,
          e.clientY || rect.top + rect.height * 0.5,
          isReducedMotion()
        );
      }

      bouquetCounterEl.innerHTML = `В букете: <strong>${collectedWishes.size}</strong> / ${GLASS_WISH_PANELS.length}`;

      if (collectedWishes.size === GLASS_WISH_PANELS.length && !already) {
        celebrationPetals.launchShower(isReducedMotion());
        showToast('Весь букет пожеланий собран — с Днём Матери, мамочка!');
      }
    });
  });

  // Floating anytime petal shower button
  document.getElementById('floating-petal-fab')?.addEventListener('click', () => {
    celebrationPetals.launchShower(isReducedMotion());
  });

  // Scroll Reveal Observer
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
  );
  document.querySelectorAll<HTMLElement>('.reveal-up').forEach((el) => revealObserver.observe(el));

  const applyMotionState = (): void => {
    const reduced = isReducedMotion();
    cloudStage.setReducedMotion(reduced);
    heroPetals.setReducedMotion(reduced);
    if (heroVideo) {
      if (reduced) heroVideo.pause();
      else void heroVideo.play().catch(() => {});
    }
    updateScrollEffects();
  };
  osReducedQuery.addEventListener('change', applyMotionState);
  applyMotionState();

  // Toast helper
  const toastEl = document.getElementById('toast-banner') as HTMLElement;
  let toastTimer: number | null = null;
  function showToast(message: string): void {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 3200);
  }

  // Celebration Modal
  const celebrationModal = document.getElementById('celebration-modal') as HTMLElement;
  const celebrateBtn = document.getElementById('celebrate-btn') as HTMLButtonElement;
  const celebrationClose = document.getElementById('celebration-close') as HTMLButtonElement;
  const downloadCardBtn = document.getElementById('download-card-btn') as HTMLButtonElement;
  const copyLinkBtn = document.getElementById('copy-link-btn') as HTMLButtonElement;
  const morePetalsBtn = document.getElementById('more-petals-btn') as HTMLButtonElement;

  const openCelebrationModal = (): void => {
    celebrationPetals.launchShower(isReducedMotion());
    celebrationModal.classList.add('is-open');
    celebrationModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    celebrationClose.focus();
  };

  const closeCelebrationModal = (): void => {
    celebrationModal.classList.remove('is-open');
    celebrationModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    celebrateBtn.focus();
  };

  celebrateBtn.addEventListener('click', openCelebrationModal);
  celebrationClose.addEventListener('click', closeCelebrationModal);
  celebrationModal.addEventListener('click', (e) => {
    if (e.target === celebrationModal) closeCelebrationModal();
  });

  morePetalsBtn.addEventListener('click', () => {
    celebrationPetals.launchShower(isReducedMotion());
  });

  copyLinkBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Ссылка на открытку скопирована');
    } catch {
      showToast('Скопируйте ссылку из адресной строки браузера');
    }
  });

  downloadCardBtn.addEventListener('click', async () => {
    downloadCardBtn.disabled = true;
    downloadCardBtn.textContent = 'Создаю открытку…';
    try {
      await exportMothersDayCardPNG();
      showToast('Открытка для мамы сохранена в PNG');
    } finally {
      downloadCardBtn.disabled = false;
      downloadCardBtn.textContent = 'Сохранить открытку (PNG)';
    }
  });

  // Editorial Gallery Lightbox
  const lightboxModal = document.getElementById('lightbox-modal') as HTMLElement;
  const lightboxClose = document.getElementById('lightbox-close') as HTMLButtonElement;
  const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
  const lightboxPlate = document.getElementById('lightbox-plate') as HTMLElement;
  const lightboxTitle = document.getElementById('lightbox-title') as HTMLElement;
  const lightboxEssay = document.getElementById('lightbox-essay') as HTMLElement;
  const lightboxPrev = document.getElementById('lightbox-prev') as HTMLButtonElement;
  const lightboxNext = document.getElementById('lightbox-next') as HTMLButtonElement;

  let currentLightboxIdx = 0;
  let lastGalleryTrigger: HTMLElement | null = null;

  const renderLightbox = (index: number): void => {
    currentLightboxIdx = ((index % EDITORIAL_GALLERY.length) + EDITORIAL_GALLERY.length) % EDITORIAL_GALLERY.length;
    const item = EDITORIAL_GALLERY[currentLightboxIdx];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt;
    lightboxPlate.textContent = item.plate;
    lightboxTitle.textContent = item.title;
    lightboxEssay.textContent = item.essay;
  };

  const openLightbox = (index: number, trigger: HTMLElement): void => {
    lastGalleryTrigger = trigger;
    renderLightbox(index);
    lightboxModal.classList.add('is-open');
    lightboxModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  };

  const closeLightbox = (): void => {
    lightboxModal.classList.remove('is-open');
    lightboxModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastGalleryTrigger?.focus();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-gallery-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openLightbox(Number(btn.dataset.galleryIndex || 0), btn);
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => renderLightbox(currentLightboxIdx - 1));
  lightboxNext.addEventListener('click', () => renderLightbox(currentLightboxIdx + 1));
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) closeLightbox();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (celebrationModal.classList.contains('is-open')) closeCelebrationModal();
      if (lightboxModal.classList.contains('is-open')) closeLightbox();
    } else if (lightboxModal.classList.contains('is-open')) {
      if (e.key === 'ArrowLeft') renderLightbox(currentLightboxIdx - 1);
      if (e.key === 'ArrowRight') renderLightbox(currentLightboxIdx + 1);
    }
  });
}

initApp();
