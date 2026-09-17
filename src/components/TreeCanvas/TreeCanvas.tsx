import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { Person, Family } from "../../data/types";
import type { LayoutFn } from "../../layout/layout.types";
import { PersonCard } from "../PersonCard/PersonCard";

interface TreeCanvasProps {
  people: Person[];
  families: Family[];
  centerPersonId: string;
  layoutFn: LayoutFn;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
}

export function TreeCanvas({
  people,
  families,
  centerPersonId,
  layoutFn,
  selectedPersonId,
  onSelectPerson,
}: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const layout = useMemo(
    () => layoutFn(people, families, centerPersonId),
    [people, families, centerPersonId, layoutFn]
  );

  useEffect(() => {
    if (!svgRef.current || !groupRef.current) return;
    const svg = d3.select(svgRef.current);
    const group = d3.select(groupRef.current);

    // ponytail: camera reset on re-center is instant; add a d3 transition
    // for a smooth animated pan if that's noticeably jarring in practice.
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .extent([[0, 0], [window.innerWidth, window.innerHeight]])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        group.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(window.innerWidth / 2, window.innerHeight / 2)
    );

    return () => {
      svg.on(".zoom", null);
    };
  }, [centerPersonId]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.personId, n])), [layout]);

  return (
    <svg ref={svgRef} className="h-full w-full bg-slate-100">
      <g ref={groupRef}>
        {layout.edges.map((edge) => {
          const from = nodeById.get(edge.fromPersonId);
          const to = nodeById.get(edge.toPersonId);
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#94a3b8" strokeWidth={2} />;
        })}
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
