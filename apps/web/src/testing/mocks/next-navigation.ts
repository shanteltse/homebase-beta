import type { Mock } from "vitest";
import { vi } from "vitest";

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

export const useRouter: Mock = vi.fn(() => ({ push, replace, back }));
export const usePathname: Mock = vi.fn(() => "/tasks");
export const useSearchParams: Mock = vi.fn(() => new URLSearchParams());
