import React from 'react';
import { Github, Book, MessageSquare, Bug } from 'lucide-react';

export function Footer() {
  const links = [
    {
      title: "Source Code",
      href: "https://github.com/RayLabsHQ/gitea-mirror",
      icon: Github
    },
    {
      title: "Documentation",
      href: "https://github.com/RayLabsHQ/gitea-mirror/tree/main/docs",
      icon: Book
    },
    {
      title: "Discussions",
      href: "https://github.com/RayLabsHQ/gitea-mirror/discussions",
      icon: MessageSquare
    },
    {
      title: "Report Issue",
      href: "https://github.com/RayLabsHQ/gitea-mirror/issues",
      icon: Bug
    }
  ];

  return (
    <footer className="border-t py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-6 sm:gap-8">
          {/* Logo and tagline */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img
                src="/logo-light.svg"
                alt="Gitea Mirror"
                className="w-6 h-6 sm:w-8 sm:h-8 dark:hidden"
              />
              <img
                src="/logo-dark.svg"
                alt="Gitea Mirror"
                className="w-6 h-6 sm:w-8 sm:h-8 hidden dark:block"
              />
              <span className="font-semibold text-base sm:text-lg">Gitea Mirror</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Keep your GitHub code safe and synced
            </p>
          </div>

          {/* Links */}
          <nav className="grid grid-cols-2 sm:flex items-center justify-center gap-4 sm:gap-6 text-center">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.title}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors py-2 sm:py-0"
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{link.title}</span>
                </a>
              );
            })}
          </nav>

          {/* Copyright */}
          <div className="text-center text-xs sm:text-sm text-muted-foreground px-4">
            <p>© {new Date().getFullYear()} Gitea Mirror. Open source under GPL-3.0 License.</p>
            <p className="mt-1">
              Made with dedication by the{' '}
              <a 
                href="https://github.com/RayLabsHQ" 
                className="underline hover:text-foreground transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                RayLabs team
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}