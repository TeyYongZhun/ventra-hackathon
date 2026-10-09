import { SOSButton } from './SOSButton';

// Top-right SOS. z-index 50 keeps it above overlays (daily note is 45) so SOS always stays reachable.
export function SOSSlot() {
  return (
    <div data-noprint style={{ position: 'relative', zIndex: 50, flexShrink: 0 }}>
      <SOSButton />
    </div>
  );
}
