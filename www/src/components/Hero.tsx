import { Button } from "./ui/button";
import { ArrowRight, Shield, RefreshCw } from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import React, { Suspense } from 'react';

const Spline = React.lazy(() => import('@splinetool/react-spline'));

export function Hero() {

  return (
    <section className="relative min-h-[100vh] pt-20 pb-10 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* spline object */}
      <div className="spline-object absolute inset-0 max-lg:-z-10 max-h-[40rem] -translate-y-16 md:max-h-[50rem] lg:max-h-[60%] xl:max-h-[70%] 2xl:max-h-[80%] md:-translate-y-24 lg:-translate-y-28 flex items-center justify-center">

        <div className="block md:hidden w-[80%]">
          <img
            src="/assets/hero_logo.webp"
            alt="Gitea Mirror hero image"
            className="w-full h-full object-contain"
          />
          </div>
        <div className="absolute right-2 bottom-4 h-20 w-40 bg-background hidden md:block"/>
        <Suspense fallback={
          <div className="w-full h-full md:flex items-center justify-center hidden">
            <img
              src="/assets/hero_logo.webp"
              alt="Gitea Mirror hero logo"
              className="w-[200px] h-[160px] md:w-[280px] md:h-[240px] lg:w-[360px] lg:h-[320px] xl:w-[420px] xl:h-[380px] 2xl:w-[480px] 2xl:h-[420px] object-contain"
            />
          </div>
        }>
          <Spline
            scene="https://prod.spline.design/jl0aKWbdH9vHQnYV/scene.splinecode"
            className="hidden md:block"
          />  
        </Suspense>
      </div>
      {/* div to avoid clipping in lower screen heights */}
      <div className="clip-avoid w-full h-[16rem] md:h-[20rem] lg:h-[12rem] 2xl:h-[16rem]" aria-hidden="true"></div>
      <div className="max-w-7xl mx-auto pb-20 lg:pb-60 xl:pb-24 text-center w-full">
        <h1 className="pt-10 2xl:pt-20 text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
          <span className="text-foreground">Keep Your Code</span>
          <br />
          <span className="text-gradient from-primary via-accent to-accent-purple">
            Safe & Synced
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4 z-20">
          Automatically mirror your GitHub repositories to self-hosted Gitea.
          Never lose access to your code with continuous backup and
          synchronization.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground px-4 z-20">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium">Self-Hosted</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent">
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium">Auto-Sync</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-purple/10 text-accent-purple">
            <GitHubLogoIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium">Open Source</span>
          </div>
        </div>

        {/* Call to action buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4 z-20">
          <Button
            size="lg"
            className="relative group w-full sm:w-auto min-h-[48px] text-base bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            asChild
          >
            <a
              href="https://github.com/RayLabsHQ/gitea-mirror"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="relative w-full sm:w-auto min-h-[48px] text-base border-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground transition-all duration-300"
            asChild
          >
            <a href="#features">View Features</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
