import * as Icons from 'lucide-react';

interface Props {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 20, className = '', color }: Props) {
  const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string; color?: string }>>)[name];
  if (!LucideIcon) return <Icons.Wallet size={size} className={className} color={color} />;
  return <LucideIcon size={size} className={className} color={color} />;
}
