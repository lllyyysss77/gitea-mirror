import React, { useEffect, useState } from 'react';
import { Github, Star } from 'lucide-react';
import { Button } from './ui/button';

export function GitHubButton() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    const fetchStars = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/RayLabsHQ/gitea-mirror');
        if (response.ok) {
          const data = await response.json();
          setStars(data.stargazers_count);
        }
      } catch (error) {
        console.error('Failed to fetch GitHub stars:', error);
      }
    };

    fetchStars();
  }, []);

  return (
    <Button variant="outline" size="sm" asChild>
      <a href="https://github.com/RayLabsHQ/gitea-mirror" target="_blank" rel="noopener noreferrer">
        <Github className="w-4 h-4 mr-2" />
        <span>Star on GitHub</span>
        {stars !== null && (
          <>
            <span className="mx-2 text-muted-foreground">•</span>
            <Star className="w-3 h-3 mr-1" />
            <span>{stars}</span>
          </>
        )}
      </a>
    </Button>
  );
}