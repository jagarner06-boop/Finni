import type { ComponentProps } from 'react';
import { Button } from './Button';
export function SecondaryButton(props: Omit<ComponentProps<typeof Button>, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}
