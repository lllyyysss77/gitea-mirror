export interface UseCase {
  slug: string;
  title: string;
  summary: string;
  painPoint: string;
  outcome: string;
  tags: string[];
}

export const useCases: UseCase[] = [
  {
    slug: 'backup-github-repositories',
    title: 'Backup GitHub Repositories',
    summary: 'Continuously mirror GitHub repositories into self-hosted Gitea so your side projects stay safe even when GitHub hiccups.',
    painPoint: 'Homelabbers rely on GitHub availability but want local backups that preserve history, metadata, and LFS assets.',
    outcome: 'Automated syncs capture full repository history, metadata, and file storage so you always have an up-to-date local copy.',
    tags: ['Redundancy', 'Continuous Sync', 'Homelab'],
  },
  {
    slug: 'deploy-with-helm-chart',
    title: 'Deploy with Helm Chart',
    summary: 'Install the project on Kubernetes in a few commands using the maintained Helm chart to keep your backup mirror humming.',
    painPoint: 'Self-hosters want reproducible Git backups without hand-rolling manifests for every cluster or upgrade.',
    outcome: 'Versioned Helm values capture backup config, making redeploys and upgrades fast, scriptable, and low-risk.',
    tags: ['Kubernetes', 'Helm', 'Homelab'],
  },
  {
    slug: 'proxmox-lxc-homelab',
    title: 'Spin Up on Proxmox LXC',
    summary: 'Run the one-liner Proxmox VE script to launch gitea-mirror inside a tuned LXC container for your lab backups.',
    painPoint: 'Proxmox homelabbers want a repeatable Git backup without manually wiring containers, volumes, and services.',
    outcome: 'The community script provisions the container, installs Bun, and wires persistence so mirroring works minutes after boot.',
    tags: ['Proxmox', 'Automation', 'Homelab'],
  },
];
