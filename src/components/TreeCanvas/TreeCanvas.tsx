import { useLayoutEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { Person, Family } from "../../data/types";
import type { LayoutFn } from "../../layout/layout.types";
import { PersonCard, CARD_WIDTH, CARD_HEIGHT } from "../PersonCard/PersonCard";
import { computeFitTransform } from "./fitTransform";
import { buildFamilyConnectors, type ConnectorStyle } from "./familyConnectors";

const VIEWPORT_PADDING = 80;

interface TreeCanvasProps {
  people: Person[];
  families: Family[];
  centerPersonId: string;
  layoutFn: LayoutFn;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  showSiblings?: boolean;
  edgeStyle?: ConnectorStyle;
}

export function TreeCanvas({
  people,
  families,
  centerPersonId,
  layoutFn,
  selectedPersonId,
  onSelectPerson,
  showSiblings = true,
  edgeStyle = "elbow",
}: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const layout = useMemo(
    () => layoutFn(people, families, centerPersonId, { showSiblings }),
    [people, families, centerPersonId, layoutFn, showSiblings]
  );

  useLayoutEffect(() => {
    if (!svgRef.current || !groupRef.current) return;
    const svg = d3.select(svgRef.current);
    const group = d3.select(groupRef.current);

    // ponytail: camera reset on re-center is instant; add a d3 transition
    // for a smooth animated pan if that's noticeably jarring in practice.
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .extent([[0, 0], [window.innerWidth, window.innerHeight]])
      .filter((event: MouseEvent | WheelEvent) => {
        if (event.type === "wheel") return true;
        const target = event.target as Element | null;
        return !event.ctrlKey && !(event as MouseEvent).button && !target?.closest("button");
      })
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        group.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);

    // Fit every node in the current layout within the viewport, instead of
    // always centering at scale 1 — otherwise a relative placed far from
    // the center (e.g. an extra sibling the naive spacing pushed further
    // out) can end up entirely outside the visible pan/zoom window, which
    // looks exactly like they vanished until you happen to zoom out.
    const fit = computeFitTransform(
      layout.nodes,
      window.innerWidth,
      window.innerHeight,
      CARD_WIDTH,
      CARD_HEIGHT,
      VIEWPORT_PADDING
    );
    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(fit.x, fit.y).scale(fit.k));

    return () => {
      svg.on(".zoom", null);
    };
  }, [centerPersonId, layout]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.personId, n])), [layout]);
  const connectors = useMemo(
    () => buildFamilyConnectors(families, nodeById, edgeStyle),
    [families, nodeById, edgeStyle]
  );

  return (
    <svg ref={svgRef} className="h-full w-full bg-slate-100">
      <g ref={groupRef}>
        {connectors.map((segment) => (
          <line
            key={segment.id}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke="#94a3b8"
            strokeWidth={2}
          />
        ))}
        {layout.nodes.map((node) => {
          const person = peopleById.get(node.personId);
          if (!person) return null;
          return (
            <PersonCard
              key={node.personId}
              person={person}
              x={node.x}
              y={node.y}
              isSelected={node.personId === selectedPersonId}
              onSelect={onSelectPerson}
            />
          );
        })}
      </g>
    </svg>
  );
}
