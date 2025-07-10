'use client';

import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

import { toast, Toaster } from 'sonner';
import { showErrorToast } from '@/lib/utils';


export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;

    if (!email || !password) {
      toast.error('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      toast.success('Login successful!');
      // Small delay before redirecting to see the success message
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-light.svg"
              alt="Gitea Mirror Logo"
              className="h-10 w-10 dark:hidden"
            />
            <img
              src="/logo-dark.svg"
              alt="Gitea Mirror Logo"
              className="h-10 w-10 hidden dark:block"
            />
          </div>
          <CardTitle className="text-2xl">Gitea Mirror</CardTitle>
          <CardDescription>
            Log in to manage your GitHub to Gitea mirroring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button type="submit" form="login-form" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log In'}
          </Button>
        </CardFooter>
        <div className="px-6 pb-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account? Contact your administrator.
          </p>
        </div>
      </Card>
      <Toaster />
    </>
  );
}
