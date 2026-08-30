import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges, GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import { Vector3, type Mesh } from "three";
import {
  Box,
  Drill,
  Focus,
  Link2,
  MousePointer2,
  PanelLeftOpen,
  PanelRightOpen,
  Scissors,
} from "lucide-react";

import { deriveMachining } from "../../../domain/joints/machining";
import type { Face, MachiningOp } from "../../../domain/joints/schema";
import { evaluateParameters } from "../../../domain/params/evaluate";
import { partKey } from "../../../domain/project/parse";
import type {
  ProfileDefinition,
  ProfileInstance,
  ProjectDocumentV1,
} from "../../../domain/project/schema";
import { localizeParameterLabel } from "../i18n/domain-copy";
import { useI18n } from "../i18n/i18n";
import { useLayoutStore } from "../store/layout-store";
import { selectCurrentProject, useProjectStore } from "../store/project-store";

const MM_TO_M = 0.001;

/** Reused so the per-frame marker scaling allocates nothing. */
const SCRATCH = new Vector3();

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

/** Outward normal of a world-axis face, in three.js space (Y is domain Z). */
const FACE_NORMALS: Record<Face, Position> = {
  "+x": [1, 0, 0],
  "-x": [-1, 0, 0],
  "+y": [0, 0, 1],
  "-y": [0, 0, -1],
  "+z": [0, 1, 0],
  "-z": [0, -1, 0],
};

/**
 * A hole marker sitting on the face it is drilled into. Tapped holes read as
 * solid, through holes as open rings, so the two are told apart at a glance.
 */
function MachiningMarker({ op, dimmed }: { op: MachiningOp; dimmed: boolean }) {
  const normal = FACE_NORMALS[op.face];
  // Lift the disc off the surface so it does not z-fight with the profile.
  const lift = 0.0015;
  const position: Position = [
    op.positionMm.x * MM_TO_M + normal[0] * lift,
    op.positionMm.z * MM_TO_M + normal[1] * lift,
    op.positionMm.y * MM_TO_M + normal[2] * lift,
  ];
  const radius = (op.diameterMm / 2) * MM_TO_M;
  const rotation: Position =
    normal[1] !== 0
      ? [normal[1] > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]
      : normal[0] !== 0
        ? [0, normal[0] > 0 ? Math.PI / 2 : -Math.PI / 2, 0]
        : [0, normal[2] > 0 ? 0 : Math.PI, 0];
  const tapped = op.kind === "tap";
  const locator = useRef<Mesh>(null);

  // A real M8 hole is ~7 mm across a 2 m frame, far too small to find at working
  // zoom. The disc stays true to size; a locator ring around it holds a constant
  // apparent size so the hole is findable without lying about how big it is.
  useFrame((state) => {
    if (!locator.current) return;
    const distance = state.camera.position.distanceTo(locator.current.getWorldPosition(SCRATCH));
    locator.current.scale.setScalar(Math.max(1, (distance * 0.011) / radius));
  });

  return (
    <group position={position} rotation={rotation} renderOrder={2}>
      <mesh ref={locator}>
        <ringGeometry args={[radius * 0.88, radius, 24]} />
        <meshBasicMaterial
          color={tapped ? "#e0a33f" : "#7fd3f2"}
          transparent
          opacity={dimmed ? 0.2 : 0.75}
          depthTest={false}
          side={2}
        />
      </mesh>
      <mesh>
        {tapped ? (
          <circleGeometry args={[radius, 20]} />
        ) : (
          <ringGeometry args={[radius * 0.62, radius, 20]} />
        )}
        <meshBasicMaterial
          color={tapped ? "#f0be6a" : "#a8e4f8"}
          transparent
          opacity={dimmed ? 0.25 : 1}
          depthTest={false}
          side={2}
        />
      </mesh>
    </group>
  );
}

/** A translucent block standing in for the connector body at a joint. */
function JointMarker({ position, highlighted }: { position: Position; highlighted: boolean }) {
  const size = 0.026;
  return (
    <mesh position={position} renderOrder={1}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={highlighted ? "#8fbde3" : "#5f7f96"}
        transparent
        opacity={highlighted ? 0.85 : 0.5}
        roughness={0.5}
      />
    </mesh>
  );
}

function ContextGuides({ project }: { project: ProjectDocumentV1 }) {
  const values = evaluateParameters(project.parameters);
  const obstacleWidth = values.obstacleOuterWidth ?? values.bedOuterWidth;
  const obstacleHeight = values.obstacleTopHeight ?? values.mattressTopHeight;
  const frameOuterWidth = values.frameOuterWidth;
  const insetPanel =
    values.topFrameOuterDepth !== undefined && values.panelFitClearance !== undefined;
  const topFrameOuterDepth = values.topFrameOuterDepth ?? values.tabletopDepth;
  const frameSideRailWidth = values.uprightWidthX;
  const topBeamWidth = values.topBeamWidth ?? frameSideRailWidth;
  const panelFitClearance = values.panelFitClearance ?? 0;
  const tabletopWidth = values.tabletopWidth;
  const tabletopDepth = values.tabletopDepth;
  const tabletopThickness = values.tabletopThickness;
  const finishedHeight = values.finishedHeight;
  if (
    [
      obstacleWidth,
      obstacleHeight,
      frameOuterWidth,
      frameSideRailWidth,
      topBeamWidth,
      tabletopWidth,
      tabletopDepth,
      tabletopThickness,
      finishedHeight,
    ].some((value) => value === undefined)
  ) {
    return null;
  }

  const obstacleStartX = (values.uprightWidthX + values.clearanceLeft) * MM_TO_M;
  const obstacleDepth = topFrameOuterDepth * MM_TO_M;
  const panelCenterX = insetPanel
    ? (frameSideRailWidth + panelFitClearance + tabletopWidth * 0.5) * MM_TO_M
    : (frameOuterWidth + (values.tabletopRightOverhang ?? 0) - (values.tabletopLeftOverhang ?? 0)) *
      0.5 *
      MM_TO_M;
  const panelCenterY = insetPanel
    ? (topBeamWidth + panelFitClearance + tabletopDepth * 0.5) * MM_TO_M
    : tabletopDepth * MM_TO_M * 0.5;
  const supportWidth = 10;
  const supportThickness = 4;
  const supportCenterZ = (finishedHeight - tabletopThickness - supportThickness * 0.5) * MM_TO_M;
  const frontSupportCenterY = (topBeamWidth + panelFitClearance + supportWidth * 0.5) * MM_TO_M;
  const rearSupportCenterY =
    (topFrameOuterDepth - topBeamWidth - panelFitClearance - supportWidth * 0.5) * MM_TO_M;
  const leftSupportCenterX =
    (frameSideRailWidth + panelFitClearance + supportWidth * 0.5) * MM_TO_M;
  const rightSupportCenterX =
    (frameOuterWidth - frameSideRailWidth - panelFitClearance - supportWidth * 0.5) * MM_TO_M;
  return (
    <group>
      <mesh
        position={[
          obstacleStartX + obstacleWidth * MM_TO_M * 0.5,
          obstacleHeight * MM_TO_M - 0.09,
          obstacleDepth * 0.5,
        ]}
        receiveShadow
      >
        <boxGeometry args={[obstacleWidth * MM_TO_M, 0.18, obstacleDepth]} />
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

function Scene({
  project,
  showMachining,
  showJoints,
  isolate,
  sectionAxis,
  sectionMm,
}: {
  project: ProjectDocumentV1;
  showMachining: boolean;
  showJoints: boolean;
  isolate: boolean;
  sectionAxis: "off" | "x" | "y" | "z";
  sectionMm: number;
}) {
  const selectedEntityId = useProjectStore((state) => state.selectedEntityId);
  const selectEntity = useProjectStore((state) => state.selectEntity);
  const selectedJointId = useProjectStore((state) => state.selectedJointId);
  const machining = deriveMachining(project);

  /** The section slider hides everything past the cut plane. */
  function beyondSection(pointMm: { x: number; y: number; z: number }): boolean {
    if (sectionAxis === "off") return false;
    return pointMm[sectionAxis] > sectionMm;
  }

  const visibleProfiles = Object.values(project.entities).filter((profile) => {
    if (isolate && selectedEntityId && profile.id !== selectedEntityId) return false;
    const centre = { ...profile.origin };
    centre[profile.axis] += profile.lengthMm / 2;
    return !beyondSection(centre);
  });
  const visibleIds = new Set(visibleProfiles.map((profile) => profile.id));

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

      {!isolate && sectionAxis === "off" && <ContextGuides project={project} />}
      {visibleProfiles.map((profile) => {
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

      {showMachining &&
        machining
          .filter((op) => visibleIds.has(op.entityId) && !beyondSection(op.positionMm))
          .map((op, index) => (
            <MachiningMarker
              key={`${op.sourceJointId}-${op.entityId}-${index}`}
              op={op}
              dimmed={Boolean(selectedJointId) && op.sourceJointId !== selectedJointId}
            />
          ))}

      {showJoints &&
        Object.values(project.joints ?? {}).map((joint) => {
          const primary = project.entities[joint.primary.entityId];
          if (!primary || !visibleIds.has(primary.id)) return null;
          const point = { ...primary.origin };
          point[primary.axis] += joint.primary.end === "a" ? 0 : primary.lengthMm;
          if (beyondSection(point)) return null;
          return (
            <JointMarker
              key={joint.id}
              position={[point.x * MM_TO_M, point.z * MM_TO_M, point.y * MM_TO_M]}
              highlighted={joint.id === selectedJointId}
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
  const leftCollapsed = useLayoutStore((state) => state.leftCollapsed);
  const rightCollapsed = useLayoutStore((state) => state.rightCollapsed);
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed);
  const project = useProjectStore(selectCurrentProject);
  const selectEntity = useProjectStore((state) => state.selectEntity);
  const values = evaluateParameters(project.parameters);
  const readouts = readoutIds.filter((id) => values[id] !== undefined);
  const selectedEntityId = useProjectStore((state) => state.selectedEntityId);
  const [showMachining, setShowMachining] = useState(true);
  const [showJoints, setShowJoints] = useState(true);
  const [isolate, setIsolate] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<"off" | "x" | "y" | "z">("off");
  const [sectionMm, setSectionMm] = useState(2_000);
  const hasJoints = Object.keys(project.joints ?? {}).length > 0;

  return (
    <main className="viewport-shell">
      <div className="viewport-topline">
        <div className="view-name">
          {leftCollapsed && (
            <button
              className="viewport-expand"
              type="button"
              aria-label={t("layout.expandLeft")}
              title={t("layout.expandLeft")}
              data-testid="expand-left"
              onClick={() => toggleCollapsed("left")}
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
          <Box size={14} />
          <span className="view-title">{t("viewport.view")}</span>
        </div>
        <div className="view-toggles">
          {hasJoints && (
            <>
              <button
                className={showMachining ? "is-on" : ""}
                type="button"
                data-testid="toggle-machining"
                aria-pressed={showMachining}
                onClick={() => setShowMachining((current) => !current)}
              >
                <Drill size={12} /> {t("viewport.showMachining")}
              </button>
              <button
                className={showJoints ? "is-on" : ""}
                type="button"
                data-testid="toggle-joints"
                aria-pressed={showJoints}
                onClick={() => setShowJoints((current) => !current)}
              >
                <Link2 size={12} /> {t("viewport.showJoints")}
              </button>
            </>
          )}
          <button
            className={isolate ? "is-on" : ""}
            type="button"
            data-testid="toggle-isolate"
            aria-pressed={isolate}
            disabled={!selectedEntityId}
            onClick={() => setIsolate((current) => !current)}
          >
            <Focus size={12} /> {t("viewport.isolate")}
          </button>
          <label className="view-section">
            <Scissors size={12} />
            <select
              data-testid="section-axis"
              value={sectionAxis}
              onChange={(event) => setSectionAxis(event.target.value as "off" | "x" | "y" | "z")}
            >
              <option value="off">{t("viewport.sectionOff")}</option>
              <option value="x">X</option>
              <option value="y">Y</option>
              <option value="z">Z</option>
            </select>
            {sectionAxis !== "off" && (
              <input
                type="range"
                data-testid="section-position"
                min={0}
                max={3000}
                step={10}
                value={sectionMm}
                aria-label={t("viewport.section")}
                onChange={(event) => setSectionMm(Number(event.target.value))}
              />
            )}
          </label>
        </div>
        <div className="view-help">
          <MousePointer2 size={12} /> {t("viewport.help")}
          {rightCollapsed && (
            <button
              className="viewport-expand"
              type="button"
              aria-label={t("layout.expandRight")}
              title={t("layout.expandRight")}
              data-testid="expand-right"
              onClick={() => toggleCollapsed("right")}
            >
              <PanelRightOpen size={14} />
            </button>
          )}
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
          <Scene
            project={project}
            showMachining={showMachining}
            showJoints={showJoints}
            isolate={isolate}
            sectionAxis={sectionAxis}
            sectionMm={sectionMm}
          />
        </Canvas>

        <div className="viewport-frame" aria-hidden="true" />

        {values.panelFitClearance !== undefined && (
          <div className="viewport-stamp">
            <span>{t("viewport.panelStamp", { gap: formatNumber(values.panelFitClearance) })}</span>
          </div>
        )}

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
