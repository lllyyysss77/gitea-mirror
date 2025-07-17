# Extending Gitea Mirror

Gitea Mirror is designed with extensibility in mind through a module system.

## Module System

The application provides a module interface that allows extending functionality:

```typescript
export interface Module {
  name: string;
  version: string;
  init(app: AppContext): Promise<void>;
  cleanup?(): Promise<void>;
}
```

## Creating Custom Modules

You can create custom modules to add features:

```typescript
// my-module.ts
export class MyModule implements Module {
  name = 'my-module';
  version = '1.0.0';

  async init(app: AppContext) {
    // Add your functionality
    app.addRoute('/api/my-endpoint', this.handler);
  }

  async handler(context) {
    return new Response('Hello from my module!');
  }
}
```

## Module Context

Modules receive an `AppContext` with:
- Database access
- Event system
- Route registration
- Configuration

## Private Extensions

If you're developing private extensions:

1. Create a separate package/repository
2. Implement the module interface
3. Use Bun's linking feature for development:
   ```bash
   # In your extension
   bun link
   
   # In gitea-mirror
   bun link your-extension
   ```

## Best Practices

- Keep modules focused on a single feature
- Use TypeScript for type safety
- Handle errors gracefully
- Clean up resources in `cleanup()`
- Document your module's API

## Community Modules

Share your modules with the community:
- Create a GitHub repository
- Tag it with `gitea-mirror-module`
- Submit a PR to list it in our docs

For more details on the module system, see the source code in `/src/lib/modules/`.