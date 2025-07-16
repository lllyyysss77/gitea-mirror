# GitHub Sponsors Integration

This guide shows how GitHub Sponsors is integrated into the open-source version of Gitea Mirror.

## Components

### GitHubSponsors Card

A card component that displays in the sidebar or dashboard:

```tsx
import { GitHubSponsors } from '@/components/sponsors/GitHubSponsors';

// In your layout or dashboard
<GitHubSponsors />
```

### SponsorButton

A smaller button for headers or navigation:

```tsx
import { SponsorButton } from '@/components/sponsors/GitHubSponsors';

// In your header
<SponsorButton />
```

## Integration Points

### 1. Dashboard Sidebar

Add the sponsor card to the dashboard sidebar for visibility:

```tsx
// src/components/layout/DashboardLayout.tsx
<aside>
  {/* Other sidebar content */}
  <GitHubSponsors />
</aside>
```

### 2. Header Navigation

Add the sponsor button to the main navigation:

```tsx
// src/components/layout/Header.tsx
<nav>
  {/* Other nav items */}
  <SponsorButton />
</nav>
```

### 3. Settings Page

Add a support section in settings:

```tsx
// src/components/settings/SupportSection.tsx
<Card>
  <CardHeader>
    <CardTitle>Support Development</CardTitle>
  </CardHeader>
  <CardContent>
    <GitHubSponsors />
  </CardContent>
</Card>
```

## Behavior

- **Only appears in self-hosted mode**: The components automatically hide in hosted mode
- **Non-intrusive**: Designed to be helpful without being annoying
- **Multiple options**: GitHub Sponsors, Buy Me a Coffee, and starring the repo

## Customization

You can customize the sponsor components by:

1. Updating the GitHub Sponsors URL
2. Adding/removing donation platforms
3. Changing the styling to match your theme
4. Adjusting the placement based on user feedback

## Best Practices

1. **Don't be pushy**: Show sponsor options tastefully
2. **Provide value first**: Ensure the tool is useful before asking for support
3. **Be transparent**: Explain how sponsorships help the project
4. **Thank sponsors**: Acknowledge supporters in README or releases