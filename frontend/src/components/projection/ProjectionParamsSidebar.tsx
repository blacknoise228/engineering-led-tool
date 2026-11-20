'use client';

import React from 'react';
import { ProjectionInputs } from '@/lib/projection/types';
import SurfaceSection from './sidebar/SurfaceSection';
import OpticsSection from './sidebar/OpticsSection';
import PowerSection from './sidebar/PowerSection';

interface ProjectionParamsSidebarProps {
  inputs: ProjectionInputs;
  onChange: (updates: Partial<ProjectionInputs>) => void;
  wallArea: number;
  lensTR: number;
  beamAngleDeg: number;
  blendPxW: number;
  stackMultiplier: number;
}

export default function ProjectionParamsSidebar({
  inputs,
  onChange,
  wallArea,
  lensTR,
  beamAngleDeg,
  blendPxW,
  stackMultiplier,
}: ProjectionParamsSidebarProps) {
  return (
    <aside className="lg:col-span-4 flex flex-col gap-3.5">
      <SurfaceSection inputs={inputs} onChange={onChange} wallArea={wallArea} />
      <OpticsSection
        inputs={inputs}
        onChange={onChange}
        lensTR={lensTR}
        beamAngleDeg={beamAngleDeg}
        blendPxW={blendPxW}
      />
      <PowerSection inputs={inputs} onChange={onChange} stackMultiplier={stackMultiplier} />
    </aside>
  );
}
