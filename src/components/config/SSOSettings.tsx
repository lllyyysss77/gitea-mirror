import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface OAuthApplication {
  id: string;
  clientId: string;
  clientSecret?: string;
  name: string;
  redirectURLs: string;
  type: string;
  disabled: boolean;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export function SSOSettings() {
  const [activeTab, setActiveTab] = useState('providers');
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [applications, setApplications] = useState<OAuthApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showAppDialog, setShowAppDialog] = useState(false);
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

  // Form states for new application
  const [appForm, setAppForm] = useState({
    name: '',
    redirectURLs: '',
    type: 'web',
  });

  // Authentication methods state
  const [authMethods, setAuthMethods] = useState({
    emailPassword: true,
    sso: false,
    oidc: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [providersRes, appsRes] = await Promise.all([
        apiRequest<SSOProvider[]>('/sso/providers'),
        apiRequest<OAuthApplication[]>('/sso/applications'),
      ]);
      setProviders(providersRes);
      setApplications(appsRes);
      
      // Set auth methods based on what's configured
      setAuthMethods({
        emailPassword: true, // Always enabled
        sso: providersRes.length > 0,
        oidc: appsRes.length > 0,
      });
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
      
      // Enable SSO auth method
      setAuthMethods(prev => ({ ...prev, sso: true }));
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  const deleteProvider = async (id: string) => {
    try {
      await apiRequest(`/sso/providers?id=${id}`, { method: 'DELETE' });
      setProviders(providers.filter(p => p.id !== id));
      toast.success('Provider deleted successfully');
      
      // Disable SSO if no providers left
      if (providers.length === 1) {
        setAuthMethods(prev => ({ ...prev, sso: false }));
      }
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  const createApplication = async () => {
    try {
      const newApp = await apiRequest<OAuthApplication>('/sso/applications', {
        method: 'POST',
        data: {
          ...appForm,
          redirectURLs: appForm.redirectURLs.split('\n').filter(url => url.trim()),
        },
      });

      setApplications([...applications, newApp]);
      setShowAppDialog(false);
      setAppForm({
        name: '',
        redirectURLs: '',
        type: 'web',
      });
      toast.success('OAuth application created successfully');
      
      // Enable OIDC auth method
      setAuthMethods(prev => ({ ...prev, oidc: true }));
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      await apiRequest(`/sso/applications?id=${id}`, { method: 'DELETE' });
      setApplications(applications.filter(a => a.id !== id));
      toast.success('Application deleted successfully');
      
      // Disable OIDC if no applications left
      if (applications.length === 1) {
        setAuthMethods(prev => ({ ...prev, oidc: false }));
      }
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
      {/* Authentication Methods Card */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Methods</CardTitle>
          <CardDescription>
            Choose which authentication methods are available for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email & Password</Label>
              <p className="text-sm text-muted-foreground">
                Traditional email and password authentication
              </p>
            </div>
            <Switch
              checked={authMethods.emailPassword}
              disabled
              aria-label="Email & Password authentication"
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Single Sign-On (SSO)</Label>
              <p className="text-sm text-muted-foreground">
                Allow users to sign in with external OIDC providers
              </p>
            </div>
            <Switch
              checked={authMethods.sso}
              disabled
              aria-label="SSO authentication"
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>OIDC Provider</Label>
              <p className="text-sm text-muted-foreground">
                Allow other applications to authenticate through this app
              </p>
            </div>
            <Switch
              checked={authMethods.oidc}
              disabled
              aria-label="OIDC Provider"
            />
          </div>
        </CardContent>
      </Card>

      {/* SSO Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">SSO Providers</TabsTrigger>
          <TabsTrigger value="applications">OAuth Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SSO Providers</CardTitle>
                  <CardDescription>
                    Configure external OIDC providers for user authentication
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
                <Alert>
                  <AlertDescription>
                    No SSO providers configured. Add a provider to enable SSO authentication.
                  </AlertDescription>
                </Alert>
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
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>OAuth Applications</CardTitle>
                  <CardDescription>
                    Applications that can authenticate users through this OIDC provider
                  </CardDescription>
                </div>
                <Dialog open={showAppDialog} onOpenChange={setShowAppDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create OAuth Application</DialogTitle>
                      <DialogDescription>
                        Register a new application that can use this service for authentication
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="appName">Application Name</Label>
                        <Input
                          id="appName"
                          value={appForm.name}
                          onChange={e => setAppForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="My Application"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="appType">Application Type</Label>
                        <Select
                          value={appForm.type}
                          onValueChange={value => setAppForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger id="appType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="web">Web Application</SelectItem>
                            <SelectItem value="mobile">Mobile Application</SelectItem>
                            <SelectItem value="desktop">Desktop Application</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="redirectURLs">Redirect URLs (one per line)</Label>
                        <textarea
                          id="redirectURLs"
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={appForm.redirectURLs}
                          onChange={e => setAppForm(prev => ({ ...prev, redirectURLs: e.target.value }))}
                          placeholder="https://example.com/callback&#10;https://example.com/auth/callback"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAppDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createApplication}>Create Application</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No OAuth applications registered. Create an application to enable OIDC provider functionality.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {applications.map(app => (
                    <Card key={app.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{app.name}</h4>
                            <p className="text-sm text-muted-foreground">{app.type} application</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteApplication(app.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Client ID</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(app.clientId)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground font-mono bg-muted p-2 rounded">
                            {app.clientId}
                          </p>
                        </div>
                        
                        {app.clientSecret && (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Client secret is only shown once. Store it securely.
                            </AlertDescription>
                          </Alert>
                        )}

                        <div>
                          <p className="text-sm font-medium mb-1">Redirect URLs</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {app.redirectURLs.split(',').map((url, i) => (
                              <p key={i} className="font-mono">{url}</p>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}