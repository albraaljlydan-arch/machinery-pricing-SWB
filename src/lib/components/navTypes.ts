export interface NavItem {
  href: string;
  label: string;
  icon: 'overview' | 'grid' | 'clock' | 'x' | 'gear' | 'chart' | 'users' | 'bars' | 'tag';
  badgeCount?: number;
  badgeText?: string;
}

export interface NavGroup {
  section: string;
  items: NavItem[];
}
