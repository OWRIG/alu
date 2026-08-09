import { useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Edges, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import { Box, Focus, MousePointer2 } from "lucide-react";

import { evaluateParameters } from "../../../domain/params/evaluate";
import { partKey } from "../../../domain/project/parse";
import type {
  ProfileDefinition,
  ProfileInstance,
  ProjectDocumentV1,
} from "../../../domain/project/schema";
import { localizeParameterLabel } from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import { selectCurrentProject, useProjectStore } from "../store/project-store";

const MM_TO_M = 0.001;

type Dimensions = [number, number, number];
type Position = [number, number, number];

function sectionDimensions(profile: ProfileInstance, definition: ProfileDefinition): Dimensions {
  const rotated = profile.rotationAroundAxisDeg === 90 || profile.rotationAroundAxisDeg === 270;
  const u = (rotated ? definition.section.envelopeVMm : definition.section.envelopeUMm) * MM_TO_M;
  const v = (rotated ? definition.section.envelopeUMm : definition.section.envelopeVMm) * MM_TO_M;
  const length = profile.lengthMm * MM_TO_M;
  if (profile.axis === "x") return [length, v, u];
  if (profile.axis === "y") return [u, v, length];
  return [u, length, v];
}

function profilePosition(profile: ProfileInstance): Position {
  const position: Position = [
    profile.origin.x * MM_TO_M,
    profile.origin.z * MM_TO_M,
    profile.origin.y * MM_TO_M,
  ];
  const half = (profile.lengthMm * MM_TO_M) / 2;
  if (profile.axis === "x") position[0] += half;
  else if (profile.axis === "y") position[2] += half;
  else position[1] += half;
  return position;
}

function ProfileMesh({
  profile,
  definition,
  selected,
  onSelect,
}: {
  profile: ProfileInstance;
  definition: ProfileDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const dimensions = useMemo(() => sectionDimensions(profile, definition), [profile, definition]);
  const position = useMemo(() => profilePosition(profile), [profile]);
  const color = selected ? "#8fbde3" : hovered ? "#cdd7dd" : "#97a1a7";

  function select(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onSelect();
  }

  return (
    <mesh
      position={position}
      castShadow
      receiveShadow
      onPointerDown={select}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      <boxGeometry args={dimensions} />
      <meshStandardMaterial color={color} roughness={0.34} metalness={0.62} />
      <Edges
        threshold={12}
        color={selected ? "#e4f2fd" : "#3a4045"}
        lineWidth={selected ? 1.5 : 0.7}
      />
    </mesh>
  );
}

function ContextGuides({ project }: { project: ProjectDocumentV1 }) {
  const values = evaluateParameters(project.parameters);
  const bedWidth = values.bedOuterWidth;
  const mattressHeight = values.mattressTopHeight;
  const frameOuterWidth = values.frameOuterWidth;
  const insetPanel =
    values.topFrameOuterDepth !== undefined && values.panelFitClearance !== undefined;
  const topFrameOuterDepth = values.topFrameOuterDepth ?? values.tabletopDepth;
  const frameRailWidth = values.uprightWidthX;
  const panelFitClearance = values.panelFitClearance ?? 0;
  const tabletopWidth = values.tabletopWidth;
  const tabletopDepth = values.tabletopDepth;
  const tabletopThickness = values.tabletopThickness;
  const finishedHeight = values.finishedHeight;
  if (
    [
      bedWidth,
      mattressHeight,
      frameOuterWidth,
      frameRailWidth,
      tabletopWidth,
      tabletopDepth,
      tabletopThickness,
      finishedHeight,
    ].some((value) => value === undefined)
  ) {
    return null;
  }

  const bedStartX = (values.uprightWidthX + values.clearanceLeft) * MM_TO_M;
  const mattressDepth = 1.9;
  const panelCenterX = insetPanel
    ? (frameRailWidth + panelFitClearance + tabletopWidth * 0.5) * MM_TO_M
    : (frameOuterWidth + (values.tabletopRightOverhang ?? 0) - (values.tabletopLeftOverhang ?? 0)) *
      0.5 *
      MM_TO_M;
  const panelCenterY = insetPanel
    ? (frameRailWidth + panelFitClearance + tabletopDepth * 0.5) * MM_TO_M
    : tabletopDepth * MM_TO_M * 0.5;
  const supportWidth = 10;
  const supportThickness = 4;
  const supportCenterZ = (finishedHeight - tabletopThickness - supportThickness * 0.5) * MM_TO_M;
  const frontSupportCenterY = (frameRailWidth + panelFitClearance + supportWidth * 0.5) * MM_TO_M;
  const rearSupportCenterY =
    (topFrameOuterDepth - frameRailWidth - panelFitClearance - supportWidth * 0.5) * MM_TO_M;
  const leftSupportCenterX = (frameRailWidth + panelFitClearance + supportWidth * 0.5) * MM_TO_M;
  const rightSupportCenterX =
    (frameOuterWidth - frameRailWidth - panelFitClearance - supportWidth * 0.5) * MM_TO_M;
  return (
    <group>
      <mesh
        position={[bedStartX + bedWidth * MM_TO_M * 0.5, mattressHeight * MM_TO_M - 0.09, 0.25]}
        receiveShadow
      >
        <boxGeometry args={[bedWidth * MM_TO_M, 0.18, mattressDepth]} />
        <meshStandardMaterial
          color="#6d8794"
          transparent
          opacity={0.14}
          roughness={0.9}
          depthWrite={false}
        />
        <Edges color="#54666f" lineWidth={0.55} />
      </mesh>
      <mesh
        position={[panelCenterX, (finishedHeight - tabletopThickness / 2) * MM_TO_M, panelCenterY]}
        receiveShadow
      >
        <boxGeometry
          args={[tabletopWidth * MM_TO_M, tabletopThickness * MM_TO_M, tabletopDepth * MM_TO_M]}
        />
        <meshStandardMaterial color="#765638" roughness={0.82} metalness={0.02} />
        <Edges color="#b28b62" lineWidth={0.8} />
      </mesh>

      {insetPanel &&
        [
          {
            dimensions: [tabletopWidth, supportThickness, supportWidth] as Dimensions,
            position: [panelCenterX, supportCenterZ, frontSupportCenterY] as Position,
          },
          {
            dimensions: [tabletopWidth, supportThickness, supportWidth] as Dimensions,
            position: [panelCenterX, supportCenterZ, rearSupportCenterY] as Position,
          },
          {
            dimensions: [supportWidth, supportThickness, tabletopDepth] as Dimensions,
            position: [leftSupportCenterX, supportCenterZ, panelCenterY] as Position,
          },
          {
            dimensions: [supportWidth, supportThickness, tabletopDepth] as Dimensions,
            position: [rightSupportCenterX, supportCenterZ, panelCenterY] as Position,
          },
        ].map((support, index) => (
          <mesh key={index} position={support.position} castShadow receiveShadow>
            <boxGeometry args={support.dimensions.map((value) => value * MM_TO_M) as Dimensions} />
            <meshStandardMaterial color="#626a70" roughness={0.42} metalness={0.72} />
          </mesh>
        ))}
    </group>
  );
}

function Scene({ project }: { project: ProjectDocumentV1 }) {
  const selectedEntityId = useProjectStore((state) => state.selectedEntityId);
  const selectEntity = useProjectStore((state) => state.selectEntity);

  return (
    <>
      <color attach="background" args={["#0a0b0c"]} />
      <fog attach="fog" args={["#0a0b0c", 5.5, 13]} />
      <ambientLight intensity={0.95} />
      <directionalLight
        position={[3.5, 5.5, 2.5]}
        intensity={2.2}
        color="#f4f8fb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-3, 2, -3]} intensity={0.6} color="#7f9dc4" />

      <ContextGuides project={project} />
      {Object.values(project.entities).map((profile) => {
        const definition =
          project.embeddedParts[
            partKey(profile.definitionRef.partId, profile.definitionRef.revision)
          ]?.definition;
        if (!definition) return null;
        return (
          <ProfileMesh
            key={profile.id}
            profile={profile}
            definition={definition}
            selected={profile.id === selectedEntityId}
            onSelect={() => selectEntity(profile.id)}
          />
        );
      })}

      <Grid
        position={[0, -0.002, 0]}
        args={[12, 12]}
        cellSize={0.1}
        cellThickness={0.45}
        cellColor="#1c2023"
        sectionSize={0.5}
        sectionThickness={0.8}
        sectionColor="#2d3338"
        fadeDistance={7}
        fadeStrength={1.2}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        target={[1.12, 0.43, 0.25]}
        minDistance={1.2}
        maxDistance={8}
        maxPolarAngle={Math.PI / 2.03}
        enableDamping
        dampingFactor={0.08}
      />
      <GizmoHelper alignment="bottom-right" margin={[70, 64]}>
        <GizmoViewport
          axisColors={["#c2564b", "#7ba7cd", "#6f9d7c"]}
          labels={["X", "Z", "Y"]}
          labelColor="#e6ecf0"
        />
      </GizmoHelper>
    </>
  );
}

const readoutIds = ["frameOuterWidth", "finishedHeight"] as const;

export function ModelViewport() {
  const { t, formatNumber } = useI18n();
  const project = useProjectStore(selectCurrentProject);
  const selectEntity = useProjectStore((state) => state.selectEntity);
  const values = evaluateParameters(project.parameters);
  const readouts = readoutIds.filter((id) => values[id] !== undefined);

  return (
    <main className="viewport-shell">
      <div className="viewport-topline">
        <div className="view-name">
          <Box size={14} />
          <span className="view-title">{t("viewport.view")}</span>
          <small>{t("viewport.modelInfo")}</small>
        </div>
        <div className="view-help">
          <MousePointer2 size={12} /> {t("viewport.help")}
        </div>
      </div>

      <div
        className="canvas-wrap"
        data-testid="model-viewport"
        role="img"
        aria-label={t("viewport.aria")}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [3.7, 2.45, 3.35], fov: 36, near: 0.02, far: 100 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => selectEntity(null)}
        >
          <Scene project={project} />
        </Canvas>

        <div className="viewport-frame" aria-hidden="true" />

        <div className="viewport-stamp">
          <span>{t("viewport.modelStamp")}</span>
          <span>
            {values.panelFitClearance === undefined
              ? t("viewport.unitStamp")
              : t("viewport.panelStamp", { gap: formatNumber(values.panelFitClearance) })}
          </span>
        </div>

        {readouts.length > 0 && (
          <div className="dimension-readout">
            {readouts.map((id) => (
              <div key={id}>
                <span>{localizeParameterLabel(id, undefined, t)}</span>
                <strong>{formatNumber(values[id])} mm</strong>
              </div>
            ))}
          </div>
        )}
        {Object.keys(project.entities).length === 0 && (
          <div className="empty-canvas">
            <Focus size={26} />
            <strong>{t("viewport.emptyTitle")}</strong>
            <span>{t("viewport.emptyHelp")}</span>
          </div>
        )}
      </div>
    </main>
  );
}
