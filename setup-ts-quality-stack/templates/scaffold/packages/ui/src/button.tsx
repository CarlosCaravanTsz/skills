// Entry point "@org/ui/button". One small entry point per component family; no barrel index.
import type { ButtonHTMLAttributes } from "react"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly tone?: "primary" | "neutral"
}

export const Button = ({ tone = "neutral", type = "button", ...props }: ButtonProps) => (
  <button data-tone={tone} type={type} {...props} />
)
