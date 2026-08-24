export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
export type BadgeSize = 'sm' | 'md';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface TabItem {
  id: string;
  label: string;
  badge?: string;
  active?: boolean;
}
