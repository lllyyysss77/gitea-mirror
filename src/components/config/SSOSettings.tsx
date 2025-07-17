import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, showErrorToast } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2, ExternalLink, Loader2, AlertCircle, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '../ui/skeleton';

interface SSOProvider {
  id: string;
  issuer: string;
  domain: string;
  providerId: string;
  organizationId?: string;
  oidcConfig: {
    clientId: string;
    clientSecret: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    jwksEndpoint: string;
    userInfoEndpoint: string;
    mapping: {
      id: string;
      email: string;
      emailVerified: string;
      name: string;
      image: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export function SSOSettings() {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Form states for new provider
  const [providerForm, setProviderForm] = useState({
    issuer: '',
    domain: '',
    providerId: '',
    clientId: '',
    clientSecret: '',
    authorizationEndpoint: '',
    tokenEndpoint: '',
    jwksEndpoint: '',
    userInfoEndpoint: '',
  });



  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const providersRes = await apiRequest<SSOProvider[]>('/sso/providers');
      setProviders(providersRes);
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setIsLoading(false);
    }
  };

  const discoverOIDC = async () => {
    if (!providerForm.issuer) {
      toast.error('Please enter an issuer URL');
      return;
    }

    setIsDiscovering(true);
    try {
      const discovered = await apiRequest<any>('/sso/discover', {
        method: 'POST',
        data: { issuer: providerForm.issuer },
      });

      setProviderForm(prev => ({
        ...prev,
        authorizationEndpoint: discovered.authorizationEndpoint || '',
        tokenEndpoint: discovered.tokenEndpoint || '',
        jwksEndpoint: discovered.jwksEndpoint || '',
        userInfoEndpoint: discovered.userInfoEndpoint || '',
        domain: discovered.suggestedDomain || prev.domain,
      }));

      toast.success('OIDC configuration discovered successfully');
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setIsDiscovering(false);
    }
  };

  const createProvider = async () => {
    try {
      const newProvider = await apiRequest<SSOProvider>('/sso/providers', {
        method: 'POST',
        data: {
          ...providerForm,
          mapping: {
            id: 'sub',
            email: 'email',
            emailVerified: 'email_verified',
            name: 'name',
            image: 'picture',
          },
        },
      });

      setProviders([...providers, newProvider]);
      setShowProviderDialog(false);
      setProviderForm({
        issuer: '',
        domain: '',
        providerId: '',
        clientId: '',
        clientSecret: '',
        authorizationEndpoint: '',
        tokenEndpoint: '',
        jwksEndpoint: '',
        userInfoEndpoint: '',
      });
      toast.success('SSO provider created successfully');
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      await apiRequest(`/sso/providers?id=${id}`, { method: 'DELETE' });
      setProviders(providers.filter(p => p.id !== id));
      toast.success('Provider deleted successfully');
    } catch (error) {
      showErrorToast(error, toast);
    }
  };


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with status indicators */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Authentication & SSO</h3>
          <p className="text-sm text-muted-foreground">
            Configure how users authenticate with your application
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${providers.length > 0 ? 'bg-green-500' : 'bg-muted'}`} />
          <span className="text-sm text-muted-foreground">
            {providers.length} Provider{providers.length !== 1 ? 's' : ''} configured
          </span>
        </div>
      </div>

      {/* Info Alert for Authentication Flow */}
      {providers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Current authentication:</strong> Users sign in with email and password only. 
            Add SSO providers to enable users to sign in with their existing accounts from external services like Google, Azure AD, or any OIDC-compliant provider.
          </AlertDescription>
        </Alert>
      )}

      {/* SSO Providers */}
      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>External Identity Providers</CardTitle>
                  <CardDescription>
                    Connect external OIDC/OAuth providers (Google, Azure AD, etc.) to allow users to sign in with their existing accounts
                  </CardDescription>
                </div>
                <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add SSO Provider</DialogTitle>
                      <DialogDescription>
                        Configure an external OIDC provider for user authentication
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="issuer">Issuer URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="issuer"
                            value={providerForm.issuer}
                            onChange={e => setProviderForm(prev => ({ ...prev, issuer: e.target.value }))}
                            placeholder="https://accounts.google.com"
                          />
                          <Button
                            variant="outline"
                            onClick={discoverOIDC}
                            disabled={isDiscovering}
                          >
                            {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Discover'}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="domain">Domain</Label>
                          <Input
                            id="domain"
                            value={providerForm.domain}
                            onChange={e => setProviderForm(prev => ({ ...prev, domain: e.target.value }))}
                            placeholder="example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="providerId">Provider ID</Label>
                          <Input
                            id="providerId"
                            value={providerForm.providerId}
                            onChange={e => setProviderForm(prev => ({ ...prev, providerId: e.target.value }))}
                            placeholder="google-sso"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="clientId">Client ID</Label>
                          <Input
                            id="clientId"
                            value={providerForm.clientId}
                            onChange={e => setProviderForm(prev => ({ ...prev, clientId: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="clientSecret">Client Secret</Label>
                          <Input
                            id="clientSecret"
                            type="password"
                            value={providerForm.clientSecret}
                            onChange={e => setProviderForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="authEndpoint">Authorization Endpoint</Label>
                        <Input
                          id="authEndpoint"
                          value={providerForm.authorizationEndpoint}
                          onChange={e => setProviderForm(prev => ({ ...prev, authorizationEndpoint: e.target.value }))}
                          placeholder="https://accounts.google.com/o/oauth2/auth"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tokenEndpoint">Token Endpoint</Label>
                        <Input
                          id="tokenEndpoint"
                          value={providerForm.tokenEndpoint}
                          onChange={e => setProviderForm(prev => ({ ...prev, tokenEndpoint: e.target.value }))}
                          placeholder="https://oauth2.googleapis.com/token"
                        />
                      </div>

                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Redirect URL: {window.location.origin}/api/auth/sso/callback/{providerForm.providerId || '{provider-id}'}
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowProviderDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createProvider}>Create Provider</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {providers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-muted-foreground/50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">No SSO providers configured</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                    Enable Single Sign-On by adding an external identity provider like Google, Azure AD, or any OIDC-compliant service.
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setShowProviderDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Provider
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {providers.map(provider => (
                    <Card key={provider.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{provider.providerId}</h4>
                            <p className="text-sm text-muted-foreground">{provider.domain}</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium">Issuer</p>
                            <p className="text-muted-foreground">{provider.issuer}</p>
                          </div>
                          <div>
                            <p className="font-medium">Client ID</p>
                            <p className="text-muted-foreground font-mono">{provider.oidcConfig.clientId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
      </Card>
    </div>
  );
}