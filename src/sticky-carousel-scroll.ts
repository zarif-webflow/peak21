import { afterWebflowReady, getGsap, getHtmlElement, getMultipleHtmlElements } from "@taj-wf/utils";
import type { EmblaCarouselType } from "embla-carousel";

import { type EmblaNodeElement } from "@/types/embla";

type ChildAnimationElements = {
  details: HTMLElement | undefined | null;
  price: HTMLElement | undefined | null;
};
type ChildAnimationElementsMap = Map<number, ChildAnimationElements>;

const initStickyCarouselScroll = () => {
  const [gsap, ScrollTrigger] = getGsap(["ScrollTrigger"], "error");

  if (!gsap || !ScrollTrigger) return;

  const partnersScrollArea = getHtmlElement({ selector: "[partners-scroll-area]" });

  if (!partnersScrollArea) return;

  const carouselNode = getHtmlElement<EmblaNodeElement>({
    selector: "[data-carousel-parent][data-featured-listing]",
    parent: partnersScrollArea,
  });

  if (!carouselNode) return;

  const initCarouselAnimation = () => {
    let isInitialized = false;
    let carouselApi = carouselNode.emblaApi;
    let slideCards = getMultipleHtmlElements({
      selector: "[data-carousel-card]",
      parent: carouselNode,
    });
    let currentIndex = carouselApi?.selectedScrollSnap();

    const childAnimationElementsMap: ChildAnimationElementsMap = new Map();

    const selectCurrentSlide = (currIndex: number) => {
      if (!slideCards) {
        console.debug("selectCurrentSlide was used before carousel was initialized");
        return;
      }

      const childElementsAnimationRevealState: gsap.TweenVars = {
        yPercent: 0,
        opacity: 1,
        stagger: 0.25,
        delay: 0.15,
        overwrite: true,
      };

      const childElementsAnimationHiddenState: gsap.TweenVars = {
        yPercent: -105,
        opacity: 0.5,
        overwrite: true,
      };

      for (let i = 0; i < slideCards.length; i++) {
        const slideCard = slideCards[i]!;
        const isCurrentSlide = i === currIndex;

        const childAnimationElements = childAnimationElementsMap.get(i);
        const childAnimationElementsArr = [
          childAnimationElements?.details,
          childAnimationElements?.price,
        ].filter((el) => el !== undefined && el !== null);

        if (isCurrentSlide) {
          gsap.to(slideCard, { scale: 1, x: 0, ease: "back", duration: 0.7 });
          gsap.to(childAnimationElementsArr, childElementsAnimationRevealState);
        } else {
          const isLeftSide = i < currIndex;

          const positionIndex = isLeftSide ? currIndex - i - 1 : i - currIndex - 1;

          const transformAlign = isLeftSide ? "right" : "left";
          slideCard.style.transformOrigin = `${transformAlign} top`;

          gsap.to(slideCard, {
            x: () => {
              const gapAdjustment = Number.parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                  "--_responsive---featured-listing-carousel--animation-gap-adjustment-percent"
                )
              );

              return isLeftSide
                ? `${gapAdjustment * positionIndex}%`
                : `-${gapAdjustment * positionIndex}%`;
            },
            scale: () => {
              const scale = getComputedStyle(document.documentElement).getPropertyValue(
                "--_responsive---featured-listing-carousel--inactive-slide-scale-ratio"
              );
              return scale;
            },
            ease: "back",
            duration: 0.7,
          });
          gsap.to(childAnimationElementsArr, childElementsAnimationHiddenState);
        }
      }
    };

    const initializeSliderCards = (carouselApi: EmblaCarouselType, slideCards: HTMLElement[]) => {
      if (isInitialized) return;
      currentIndex = carouselApi.selectedScrollSnap();

      for (let i = 0; i < slideCards.length; i++) {
        const slideCard = slideCards[i]!;
        const details = getHtmlElement({ selector: "[data-featured-details]", parent: slideCard });
        const price = getHtmlElement({ selector: "[data-featured-price]", parent: slideCard });

        const childAnimationElements: ChildAnimationElements = { details, price };

        childAnimationElementsMap.set(i, childAnimationElements);
      }

      selectCurrentSlide(currentIndex);
      isInitialized = true;
    };

    if (carouselApi && slideCards) {
      initializeSliderCards(carouselApi, slideCards);
    }

    carouselNode.addEventListener("embla:init", (event) => {
      carouselApi = event.detail.embla;
      slideCards = getMultipleHtmlElements({
        selector: "[data-carousel-card]",
        parent: carouselNode,
      });

      if (!slideCards) {
        console.error("Carousel cards not found during embla:init");
        return;
      }

      initializeSliderCards(carouselApi, slideCards);
    });

    carouselNode.addEventListener("embla:select", (event) => {
      carouselApi = event.detail.embla;

      currentIndex = carouselApi.selectedScrollSnap();

      selectCurrentSlide(currentIndex);
    });

    return carouselApi;
  };

  const carouselApi = initCarouselAnimation();

  if (!carouselApi) {
    console.error("Carousel API failed to initialize, scroll animation will not work");
    return;
  }

  const navbarHeightElement = getHtmlElement({ selector: "[data-navbar-height]" });

  if (!navbarHeightElement) {
    console.error("Navbar height element not found, scroll animation will not work");
    return;
  }

  const totalSlidesLength = carouselApi.slideNodes().length;
  let lastScrolledIndex = -1;

  ScrollTrigger.create({
    trigger: partnersScrollArea,
    start: () => {
      const navbarHeight = navbarHeightElement.getBoundingClientRect().height;
      const offset = (window.innerHeight - navbarHeight - carouselNode.offsetHeight) / 2;
      return `top ${navbarHeight + offset}px`;
    },
    end: () => {
      const navbarHeight = navbarHeightElement.getBoundingClientRect().height;
      const offset = (window.innerHeight - navbarHeight - carouselNode.offsetHeight) / 2;
      return `bottom ${window.innerHeight - offset}px`;
    },
    scrub: true,
    pin: carouselNode,
    onUpdate: (self) => {
      const targetIndex = Math.round(self.progress * (totalSlidesLength - 1));

      if (targetIndex !== lastScrolledIndex) {
        lastScrolledIndex = targetIndex;
        carouselApi.scrollTo(targetIndex, false);
      }
    },
  });
};

afterWebflowReady(() => {
  initStickyCarouselScroll();
});
