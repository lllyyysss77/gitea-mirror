import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const screenshots = [
  {
    title: "Dashboard Overview",
    description: "Monitor all your mirrored repositories in one place",
    desktop: "/assets/dashboard.png",
    mobile: "/assets/dashboard_mobile.png"
  },
  {
    title: "Organization Management",
    description: "Easily manage and sync entire GitHub organizations",
    desktop: "/assets/organisation.png",
    mobile: "/assets/organisation_mobile.png"
  },
  {
    title: "Repository Control",
    description: "Fine-grained control over individual repository mirrors",
    desktop: "/assets/repositories.png",
    mobile: "/assets/repositories_mobile.png"
  },
  {
    title: "Configuration",
    description: "Simple and intuitive configuration interface",
    desktop: "/assets/configuration.png",
    mobile: "/assets/configuration_mobile.png"
  },
  {
    title: "Activity Monitoring",
    description: "Track sync progress and view detailed logs",
    desktop: "/assets/activity.png",
    mobile: "/assets/activity_mobile.png"
  }
];

export function Screenshots() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < screenshots.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? screenshots.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % screenshots.length
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const current = screenshots[currentIndex];

  return (
    <section id="screenshots" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            See It In Action
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            A clean, intuitive interface designed for efficiency and ease of use
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Screenshot viewer */}
          <div 
            ref={containerRef}
            className="relative group"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="aspect-[16/10] overflow-hidden rounded-lg sm:rounded-2xl bg-card border shadow-lg">
              <picture>
                <source media="(max-width: 640px)" srcSet={current.mobile} />
                <img
                  src={current.desktop}
                  alt={current.title}
                  className="w-full h-full object-cover object-top"
                  draggable={false}
                />
              </picture>
            </div>

            {/* Navigation buttons - hidden on mobile, visible on desktop */}
            <Button
              variant="outline"
              size="icon"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 opacity-0 sm:opacity-100 group-hover:opacity-100 transition-opacity hidden sm:flex"
              onClick={goToPrevious}
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 opacity-0 sm:opacity-100 group-hover:opacity-100 transition-opacity hidden sm:flex"
              onClick={goToNext}
              aria-label="Next screenshot"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Screenshot info */}
          <div className="mt-6 sm:mt-8 text-center">
            <h3 className="text-lg sm:text-xl font-semibold">{current.title}</h3>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">{current.description}</p>
          </div>

          {/* Dots indicator */}
          <div className="mt-6 sm:mt-8 flex justify-center gap-2">
            {screenshots.map((_, index) => (
              <button
                key={index}
                className={`transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 h-2 bg-primary rounded-full' 
                    : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50 rounded-full'
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to screenshot ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile swipe hint */}
          <p className="mt-4 text-xs text-muted-foreground text-center sm:hidden">
            Swipe left or right to navigate
          </p>
        </div>

        {/* Thumbnail grid - visible on larger screens */}
        <div className="hidden lg:grid grid-cols-5 gap-4 mt-12 px-8">
          {screenshots.map((screenshot, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                index === currentIndex 
                  ? 'ring-2 ring-primary shadow-lg scale-105' 
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={screenshot.desktop}
                alt={screenshot.title}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}