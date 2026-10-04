/**
 * Слайдер секции «Картинки» — этапы разработки:
 * 1. Конфигурация наборов изображений по категориям
 * 2. Определение числа видимых столбцов по ширине окна
 * 3. Построение барабана из столбцов с бесконечным циклом
 * 4. Переключение категорий и активной кнопки фильтра
 * 5. Сдвиг набора столбцов (6 / 4 / 1 картинок) с блокировкой повторных кликов
 * 6. Предзагрузка всех изображений в кэш браузера
 */

const GALLERY_BASE = "assets/jpg";
const GALLERY_SHIFT_DURATION_MS = 1100;
const GALLERY_SHIFT_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";
const preloadedImages = new Map();

const GALLERY_LABELS = {
  hotel: "Отель",
  spa: "Спа",
  restaurant: "Ресторан",
  leisure: "Досуг",
  nature: "Природа",
};

const GALLERY_CATEGORIES = {
  hotel: buildImagePaths("hotel", "jpg", 12),
  spa: buildImagePaths("spa", "jpg", 12),
  restaurant: buildImagePaths("restaurant", "jpg", 12),
  leisure: buildImagePaths("leisure", "jpg", 12),
  nature: buildImagePaths("nature", "jpg", 12),
};

function buildImagePaths(folder, extension, count) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return `${GALLERY_BASE}/${folder}/${folder}-${number}.${extension}`;
  });
}

function getVisibleCount() {
  const width = window.innerWidth;

  if (width >= 1024) {
    return 6;
  }

  if (width >= 768) {
    return 4;
  }

  return 1;
}

function getColumnCount() {
  const width = window.innerWidth;

  if (width >= 1024) {
    return 3;
  }

  if (width >= 768) {
    return 2;
  }

  return 1;
}

function getAllGallerySources() {
  return [...new Set(Object.values(GALLERY_CATEGORIES).flat())];
}

function preloadImage(src) {
  if (preloadedImages.has(src)) {
    return preloadedImages.get(src);
  }

  const promise = new Promise((resolve) => {
    const image = new Image();

    image.decoding = "async";

    image.onload = () => {
      if (typeof image.decode === "function") {
        image
          .decode()
          .then(() => resolve(image))
          .catch(() => resolve(image));
        return;
      }

      resolve(image);
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });

  preloadedImages.set(src, promise);
  return promise;
}

function preloadAllGalleryImages() {
  return Promise.all(getAllGallerySources().map(preloadImage));
}

class GallerySlider {
  constructor(section) {
    this.section = section;
    this.slider = section.querySelector(".gallery__slider");
    this.viewport = section.querySelector(".gallery__viewport");
    this.track = section.querySelector(".gallery__track");
    this.prevButton = section.querySelector(".gallery__arrow--left");
    this.nextButton = section.querySelector(".gallery__arrow--right");
    this.filterButtons = section.querySelectorAll(".gallery-filter");

    this.category = "hotel";
    this.currentIndex = 0;
    this.totalRealColumns = 0;
    this.columnStep = 0;
    this.isAnimating = false;
    this.visibleCount = getVisibleCount();
    this.columnCount = getColumnCount();

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.prevButton.addEventListener("click", () => this.slide("prev"));
    this.nextButton.addEventListener("click", () => this.slide("next"));

    this.filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const category = button.dataset.category;

        if (!category || category === this.category || this.isAnimating) {
          return;
        }

        this.setCategory(category);
      });
    });

    this.track.addEventListener("transitionend", (event) => {
      if (event.target !== this.track || event.propertyName !== "transform") {
        return;
      }

      this.finishTransition();
    });

    let resizeTimer;

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const nextVisibleCount = getVisibleCount();
        const nextColumnCount = getColumnCount();

        if (
          nextVisibleCount !== this.visibleCount ||
          nextColumnCount !== this.columnCount
        ) {
          this.visibleCount = nextVisibleCount;
          this.columnCount = nextColumnCount;
          this.render();
          return;
        }

        this.measure();
        this.updatePosition(false);
      }, 150);
    });
  }

  getImages() {
    return GALLERY_CATEGORIES[this.category] || [];
  }

  buildAllColumns(images) {
    const rows = this.visibleCount / this.columnCount;
    const totalColumns = Math.ceil(images.length / rows);
    const columns = [];

    for (let columnIndex = 0; columnIndex < totalColumns; columnIndex += 1) {
      const columnImages = [];

      for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        const imageIndex = rowIndex * totalColumns + columnIndex;
        columnImages.push(images[imageIndex % images.length]);
      }

      columns.push(columnImages);
    }

    return columns;
  }

  createColumnMarkup(images, columnIndex) {
    const label = GALLERY_LABELS[this.category] || "Галерея";
    const imagesMarkup = images
      .map(
        (src, imageIndex) =>
          `<figure class="gallery__item"><img class="gallery__image" src="${src}" alt="${label} ${columnIndex + 1}-${imageIndex + 1}" loading="eager" decoding="async"></figure>`,
      )
      .join("");

    return `<div class="gallery__column">${imagesMarkup}</div>`;
  }

  render() {
    const images = this.getImages();
    const allColumns = this.buildAllColumns(images);

    if (!allColumns.length) {
      this.track.innerHTML = "";
      return;
    }

    this.totalRealColumns = allColumns.length;
    const cloneCount = Math.min(this.columnCount, this.totalRealColumns);
    const extendedColumns = [
      ...allColumns.slice(-cloneCount),
      ...allColumns,
      ...allColumns.slice(0, cloneCount),
    ];

    this.currentIndex = cloneCount;
    this.isAnimating = false;
    this.slider.classList.remove("gallery__slider--animating");

    this.track.innerHTML = extendedColumns
      .map((columnImages, columnIndex) =>
        this.createColumnMarkup(columnImages, columnIndex),
      )
      .join("");

    this.measure();
    this.updatePosition(false);
  }

  measure() {
    const styles = window.getComputedStyle(this.track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap) || 0;
    const viewportWidth = this.viewport.clientWidth;
    const columnWidth =
      (viewportWidth - gap * (this.columnCount - 1)) / this.columnCount;

    this.viewport.style.setProperty("--gallery-column-width", `${columnWidth}px`);

    const columnElement = this.track.querySelector(".gallery__column");
    const actualColumnWidth = columnElement
      ? columnElement.getBoundingClientRect().width
      : columnWidth;

    this.columnStep = actualColumnWidth + gap;
  }

  updatePosition(animate) {
    const offset = this.currentIndex * this.columnStep;

    this.track.style.transition = animate
      ? `transform ${GALLERY_SHIFT_DURATION_MS}ms ${GALLERY_SHIFT_EASING}`
      : "none";
    this.track.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }

  getShiftStep() {
    return this.columnCount;
  }

  slide(direction) {
    if (this.isAnimating || this.totalRealColumns <= this.columnCount) {
      return;
    }

    this.isAnimating = true;
    this.slider.classList.add("gallery__slider--animating");

    const step = this.getShiftStep();

    if (direction === "next") {
      this.currentIndex += step;
    } else {
      this.currentIndex -= step;
    }

    this.updatePosition(true);
  }

  finishTransition() {
    const cloneCount = Math.min(this.columnCount, this.totalRealColumns);

    if (this.currentIndex >= cloneCount + this.totalRealColumns) {
      this.currentIndex = cloneCount;
      this.updatePosition(false);
    } else if (this.currentIndex < cloneCount) {
      this.currentIndex = cloneCount + this.totalRealColumns - this.columnCount;
      this.updatePosition(false);
    }

    this.isAnimating = false;
    this.slider.classList.remove("gallery__slider--animating");
  }

  setCategory(category) {
    this.category = category;
    this.visibleCount = getVisibleCount();
    this.columnCount = getColumnCount();
    this.render();
    this.updateActiveFilter();
  }

  updateActiveFilter() {
    this.filterButtons.forEach((button) => {
      const isActive = button.dataset.category === this.category;
      button.classList.toggle("gallery-filter--active", isActive);
      button.classList.toggle("btn--filter-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void initGallery();
});

const galleryPreloadPromise = preloadAllGalleryImages();

async function initGallery() {
  const gallerySection = document.querySelector(".gallery");

  if (!gallerySection) {
    return;
  }

  await galleryPreloadPromise;

  const slider = new GallerySlider(gallerySection);
  slider.updateActiveFilter();
}
