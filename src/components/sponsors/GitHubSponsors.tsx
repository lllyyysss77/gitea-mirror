import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Coffee, Zap } from "lucide-react";
import { isSelfHostedMode } from "@/lib/deployment-mode";

export function GitHubSponsors() {
  // Only show in self-hosted mode
  if (!isSelfHostedMode()) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
          <Heart className="w-5 h-5 text-pink-500" />
          Support Gitea Mirror
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-purple-800 dark:text-purple-200">
          Gitea Mirror is open source and free to use. If you find it helpful, 
          consider supporting the project!
        </p>
        
        <div className="space-y-2">
          <Button 
            variant="default" 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            asChild
          >
            <a 
              href="https://github.com/sponsors/RayLabsHQ" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Heart className="w-4 h-4 mr-2" />
              Become a Sponsor
            </a>
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900"
              asChild
            >
              <a 
                href="https://github.com/RayLabsHQ/gitea-mirror" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                ⭐ Star on GitHub
              </a>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="border-purple-300 hover:bg-purple-100 dark:border-purple-700 dark:hover:bg-purple-900"
              asChild
            >
              <a 
                href="https://buymeacoffee.com/raylabs" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Coffee className="w-4 h-4 mr-1" />
                Buy Coffee
              </a>
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-purple-600 dark:text-purple-300 space-y-1">
          <p className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Your support helps maintain and improve the project
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Smaller inline sponsor button for headers/navbars
export function SponsorButton() {
  if (!isSelfHostedMode()) {
    return null;
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <a 
        href="https://github.com/sponsors/RayLabsHQ" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        <Heart className="w-4 h-4 mr-2" />
        Sponsor
      </a>
    </Button>
  );
}