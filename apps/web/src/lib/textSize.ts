// Text size: the design sizes are Extra large (also the default when nothing is saved).
// Large scales the whole app, buttons included, down a step.
export type TextSize = 'large' | 'xl';

const ZOOM: Record<TextSize, string> = { large: '0.8', xl: '' };

// Anything other than 'large' (including nothing saved yet) is Extra large.
export function applyTextSize(size: string | null | undefined): void {
  document.documentElement.style.zoom = ZOOM[size === 'large' ? 'large' : 'xl'];
}
