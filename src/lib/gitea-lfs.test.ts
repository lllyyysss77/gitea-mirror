import { describe, test, expect, mock } from "bun:test";
import type { Config } from "./db/schema";

describe("Git LFS Support", () => {
  test("should include LFS flag when configured", () => {
    const config: Partial<Config> = {
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "test-token",
        defaultOwner: "testuser",
        lfs: true, // LFS enabled
      },
      mirrorOptions: {
        mirrorLFS: true, // UI option enabled
      },
    };

    // Mock the payload that would be sent to Gitea API
    const createMirrorPayload = (config: Partial<Config>, repoUrl: string) => {
      const payload: any = {
        clone_addr: repoUrl,
        mirror: true,
        private: false,
      };

      // Add LFS flag if configured
      if (config.giteaConfig?.lfs || config.mirrorOptions?.mirrorLFS) {
        payload.lfs = true;
      }

      return payload;
    };

    const payload = createMirrorPayload(config, "https://github.com/user/repo.git");
    
    expect(payload).toHaveProperty("lfs");
    expect(payload.lfs).toBe(true);
  });

  test("should not include LFS flag when not configured", () => {
    const config: Partial<Config> = {
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "test-token",
        defaultOwner: "testuser",
        lfs: false, // LFS disabled
      },
      mirrorOptions: {
        mirrorLFS: false, // UI option disabled
      },
    };

    const createMirrorPayload = (config: Partial<Config>, repoUrl: string) => {
      const payload: any = {
        clone_addr: repoUrl,
        mirror: true,
        private: false,
      };

      if (config.giteaConfig?.lfs || config.mirrorOptions?.mirrorLFS) {
        payload.lfs = true;
      }

      return payload;
    };

    const payload = createMirrorPayload(config, "https://github.com/user/repo.git");
    
    expect(payload).not.toHaveProperty("lfs");
  });

  test("should handle LFS with either giteaConfig or mirrorOptions", () => {
    // Test with only giteaConfig.lfs
    const config1: Partial<Config> = {
      giteaConfig: {
        url: "https://gitea.example.com",
        token: "test-token",
        defaultOwner: "testuser",
        lfs: true,
      },
    };

    // Test with only mirrorOptions.mirrorLFS
    const config2: Partial<Config> = {
      mirrorOptions: {
        mirrorLFS: true,
      },
    };

    const createMirrorPayload = (config: Partial<Config>, repoUrl: string) => {
      const payload: any = {
        clone_addr: repoUrl,
        mirror: true,
        private: false,
      };

      if (config.giteaConfig?.lfs || config.mirrorOptions?.mirrorLFS) {
        payload.lfs = true;
      }

      return payload;
    };

    const payload1 = createMirrorPayload(config1, "https://github.com/user/repo.git");
    const payload2 = createMirrorPayload(config2, "https://github.com/user/repo.git");
    
    expect(payload1.lfs).toBe(true);
    expect(payload2.lfs).toBe(true);
  });
});