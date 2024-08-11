import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getValidatedFormData } from "remix-hook-form";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ReceivedValues = Awaited<
  ReturnType<typeof getValidatedFormData>
>["receivedValues"];
