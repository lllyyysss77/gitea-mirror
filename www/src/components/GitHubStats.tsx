import React, { useEffect, useState } from 'react';
import { Star, GitFork, Users } from 'lucide-react';

interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
}

export function GitHubStats() {
  const [stats, setStats] = useState<GitHubRepo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/RayLabsHQ/gitea-mirror');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 text-white/80 text-sm sm:text-base">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8 text-white/80 text-sm sm:text-base">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-semibold">{stats?.stargazers_count || 0} Stars</span>
      </div>
      <div className="flex items-center gap-2">
        <GitFork className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-semibold">{stats?.forks_count || 0} Forks</span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-semibold">Active Community</span>
      </div>
    </div>
  );
}