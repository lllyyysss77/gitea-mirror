import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, Shield, RefreshCw } from 'lucide-react';
import { GitHubLogoIcon } from '@radix-ui/react-icons';

export function Hero() {
  return (
    <section className="relative min-h-[100vh] pt-20 pb-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Elegant gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"></div>
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-primary/10 to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-accent/10 to-transparent blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto text-center w-full">
        <div className="mb-6 sm:mb-8 flex justify-center">
          <div className="relative">
            <img
              src="/assets/logo-no-bg.png"
              alt="Gitea Mirror Logo"
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 dark:hidden"
            />
            <img
              src="/assets/logo-no-bg.png"
              alt="Gitea Mirror Logo"
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 hidden dark:block"
            />
          </div>
        </div>

        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
          <span className="text-foreground">
            Keep Your Code
          </span>
          <br />
          <span className="text-gradient from-primary via-accent to-accent-purple">
            Safe & Synced
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
          Automatically mirror your GitHub repositories to self-hosted Gitea. 
          Never lose access to your code with continuous backup and synchronization.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground px-4">
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

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          <Button size="lg" className="group w-full sm:w-auto min-h-[48px] text-base bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" asChild>
            <a href="https://github.com/RayLabsHQ/gitea-mirror" target="_blank" rel="noopener noreferrer">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px] text-base border-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-foreground transition-all duration-300" asChild>
            <a href="#features">
              View Features
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}