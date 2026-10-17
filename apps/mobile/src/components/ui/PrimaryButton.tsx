import type { ComponentProps } from "react";
import { Button } from "./Button";
export function PrimaryButton(
  props: Omit<ComponentProps<typeof Button>, "variant">,
) {
  return <Button size="lg" {...props} variant="primary" />;
}
