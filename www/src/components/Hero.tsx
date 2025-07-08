import React from 'react';
import { Button } from './ui/button';
import { ArrowRight, Github, Shield, RefreshCw } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative min-h-[100vh] pt-20 pb-10 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 -left-4 w-48 h-48 sm:w-72 sm:h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob dark:opacity-10"></div>
        <div className="absolute top-20 -right-4 w-48 h-48 sm:w-72 sm:h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 dark:opacity-10"></div>
        <div className="absolute -bottom-8 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000 dark:opacity-10"></div>
      </div>

      <div className="max-w-7xl mx-auto text-center w-full">
        <div className="mb-6 sm:mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-75 animate-pulse"></div>
            <img 
              src="/assets/logo-no-bg.png" 
              alt="Gitea Mirror Logo" 
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32"
            />
          </div>
        </div>

        <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Keep Your Code
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Safe & Synced
          </span>
        </h1>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
          Automatically mirror your GitHub repositories to self-hosted Gitea. 
          Never lose access to your code with continuous backup and synchronization.
        </p>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground px-4">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Self-Hosted</span>
          </div>
          <span className="text-gray-300 dark:text-gray-700 hidden xs:inline">•</span>
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Auto-Sync</span>
          </div>
          <span className="text-gray-300 dark:text-gray-700 hidden xs:inline">•</span>
          <div className="flex items-center gap-2">
            <Github className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Open Source</span>
          </div>
        </div>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
          <Button size="lg" className="group w-full sm:w-auto min-h-[48px] text-base" asChild>
            <a href="https://github.com/RayLabsHQ/gitea-mirror" target="_blank" rel="noopener noreferrer">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto min-h-[48px] text-base" asChild>
            <a href="#features">
              View Features
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}