import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Coffee, Sparkles } from "lucide-react";
import { isSelfHostedMode } from "@/lib/deployment-mode";

export function SponsorCard() {
  // Only show in self-hosted mode
  if (!isSelfHostedMode()) {
    return null;
  }

  return (
    <div className="mt-auto p-4 border-t">
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" />
            Support Development
          </CardTitle>
          <CardDescription className="text-xs">
            Help us improve Gitea Mirror
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Gitea Mirror is open source and free. Your sponsorship helps us maintain and improve it.
          </p>
          
          <div className="space-y-2">
            <Button 
              className="w-full h-8 text-xs" 
              size="sm"
              asChild
            >
              <a 
                href="https://github.com/sponsors/RayLabsHQ" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Heart className="w-3 h-3 mr-2" />
                Sponsor on GitHub
              </a>
            </Button>
            
            <Button 
              className="w-full h-8 text-xs" 
              size="sm" 
              variant="outline"
              asChild
            >
              <a 
                href="https://buymeacoffee.com/raylabs" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Coffee className="w-3 h-3 mr-2" />
                Buy us a coffee
              </a>
            </Button>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Pro features available in hosted version
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}