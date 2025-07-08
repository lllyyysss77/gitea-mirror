import React from 'react';
import { 
  RefreshCw, 
  Building2, 
  FolderTree, 
  Activity, 
  Lock, 
  Heart,
} from 'lucide-react';

const features = [
  {
    title: "Automated Mirroring",
    description: "Set it and forget it. Automatically sync your GitHub repositories to Gitea on a schedule.",
    icon: RefreshCw,
    gradient: "from-primary/10 to-accent/10",
    iconColor: "text-primary"
  },
  {
    title: "Bulk Operations", 
    description: "Mirror entire organizations or user accounts with a single configuration.",
    icon: Building2,
    gradient: "from-accent/10 to-accent-teal/10",
    iconColor: "text-accent"
  },
  {
    title: "Preserve Structure",
    description: "Maintain your GitHub organization structure or customize how repos are organized.",
    icon: FolderTree,
    gradient: "from-accent-teal/10 to-primary/10",
    iconColor: "text-accent-teal"
  },
  {
    title: "Real-time Status",
    description: "Monitor mirror progress with live updates and detailed activity logs.",
    icon: Activity,
    gradient: "from-accent-coral/10 to-primary/10",
    iconColor: "text-accent-coral"
  },
  {
    title: "Secure & Private",
    description: "Self-hosted solution keeps your code on your infrastructure with full control.",
    icon: Lock,
    gradient: "from-accent-purple/10 to-primary/10",
    iconColor: "text-accent-purple"
  },
  {
    title: "Open Source",
    description: "Free, transparent, and community-driven development. Contribute and customize.",
    icon: Heart,
    gradient: "from-primary/10 to-accent-purple/10",
    iconColor: "text-primary"
  }
];

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight px-4">
            Everything You Need for
            <span className="text-gradient from-primary to-accent block sm:inline"> Reliable Backups</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Powerful features designed to keep your code safe and accessible, no matter what happens.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`group relative p-6 sm:p-8 rounded-xl sm:rounded-2xl border bg-gradient-to-br ${feature.gradient} backdrop-blur-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className={`inline-flex p-2.5 sm:p-3 rounded-lg bg-background/80 backdrop-blur-sm mb-3 sm:mb-4 ${feature.iconColor} shadow-sm`}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}