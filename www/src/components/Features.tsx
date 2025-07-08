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
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "Bulk Operations", 
    description: "Mirror entire organizations or user accounts with a single configuration.",
    icon: Building2,
    gradient: "from-purple-500 to-pink-500"
  },
  {
    title: "Preserve Structure",
    description: "Maintain your GitHub organization structure or customize how repos are organized.",
    icon: FolderTree,
    gradient: "from-green-500 to-emerald-500"
  },
  {
    title: "Real-time Status",
    description: "Monitor mirror progress with live updates and detailed activity logs.",
    icon: Activity,
    gradient: "from-orange-500 to-red-500"
  },
  {
    title: "Secure & Private",
    description: "Self-hosted solution keeps your code on your infrastructure with full control.",
    icon: Lock,
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    title: "Open Source",
    description: "Free, transparent, and community-driven development. Contribute and customize.",
    icon: Heart,
    gradient: "from-pink-500 to-rose-500"
  }
];

export function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight px-4">
            Everything You Need for
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block sm:inline"> Reliable Backups</span>
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
                className="group relative p-6 sm:p-8 rounded-xl sm:rounded-2xl border bg-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-5 rounded-xl sm:rounded-2xl transition-opacity duration-300"
                     style={{
                       backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`,
                       '--tw-gradient-from': feature.gradient.split(' ')[1],
                       '--tw-gradient-to': feature.gradient.split(' ')[3],
                     }}
                />
                
                <div className={`inline-flex p-2.5 sm:p-3 rounded-lg bg-gradient-to-r ${feature.gradient} mb-3 sm:mb-4`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                
                <h3 className="text-lg sm:text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}