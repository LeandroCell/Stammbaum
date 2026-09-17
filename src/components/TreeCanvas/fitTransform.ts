export interface FitTransform {
  x: number;
  y: number;
  k: number;
}

// Computes a d3-zoom transform (translate + scale) that fits every given
// node position within the viewport, instead of always centering at scale
// 1 on the origin. Without this, a newly added relative placed far from
// the center (e.g. an extra sibling pushed further out by the naive
// spacing in classicLayout/radialLayout) can end up entirely outside the
// visible pan/zoom window — indistinguishable from having vanished until
// the user happens to zoom out or pan there themselves.
export function computeFitTransform(
  nodePositions: { x: number; y: number }[],
  viewportWidth: number,
  viewportHeight: number,
  contentWidth: number,
  contentHeight: number,
  padding: number
): FitTransform {
  if (nodePositions.length === 0) {
    return { x: viewportWidth / 2, y: viewportHeight / 2, k: 1 };
  }

  const minX = Math.min(...nodePositions.map((n) => n.x)) - contentWidth / 2;
  const maxX = Math.max(...nodePositions.map((n) => n.x)) + contentWidth / 2;
  const minY = Math.min(...nodePositions.map((n) => n.y)) - contentHeight / 2;
  const maxY = Math.max(...nodePositions.map((n) => n.y)) + contentHeight / 2;

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;

  const availableWidth = Math.max(viewportWidth - padding * 2, 1);
  const availableHeight = Math.max(viewportHeight - padding * 2, 1);

  // Never zoom in past 1x for a sparse tree, and never go below the
  // TreeCanvas zoom behavior's own scaleExtent floor (0.1) for an
  // extremely spread-out one — d3-zoom's imperative `.transform()` call
  // doesn't clamp to scaleExtent itself (only interactive gestures do).
  const scale = Math.max(0.1, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight, 1));

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    x: viewportWidth / 2 - centerX * scale,
    y: viewportHeight / 2 - centerY * scale,
    k: scale,
  };
}
