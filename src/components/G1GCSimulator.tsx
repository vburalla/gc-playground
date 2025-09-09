import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "./AppSidebar";
import { StopTheWorldIndicator } from "./StopTheWorldIndicator";

export enum RegionType {
  UNASSIGNED = "unassigned",
  EDEN = "eden",
  SURVIVOR = "survivor",
  SURVIVOR_FROM = "survivor-from", 
  SURVIVOR_TO = "survivor-to",
  TENURED = "tenured",
  HUMONGOUS = "humongous"
}

export enum CellState {
  FREE = "free",
  REFERENCED = "referenced",
  DEREFERENCED = "dereferenced", 
  MARKED = "marked",
  SURVIVED = "survived",
  COPYING = "copying"
}

export interface Region {
  id: number;
  type: RegionType;
  cells: MemoryCell[];
  occupancy: number; // 0-100%
  shouldCollect?: boolean; // For marking specific regions for collection
}

export interface MemoryCell {
  state: CellState;
  survivedCycles: number;
  id: number;
  regionId: number;
}

export const G1GCSimulator = () => {
  const [regions, setRegions] = useState<Region[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'evacuating' | 'concurrent-marking' | 'mixed-gc' | 'complete'>('allocating');
  const [gridSize, setGridSize] = useState(5); // 5x5 grid of regions
  const [speed, setSpeed] = useState(800);
  const [regionSize] = useState(4); // 4x4 cells per region (16 cells)
  const [currentEdenRegions, setCurrentEdenRegions] = useState(0);
  const maxEdenRegions = 6; // Eden regions (objetivo)
  const maxSurvivorRegions = 2; // Maximum 2 Survivor regions
  const [promoteSurvivors, setPromoteSurvivors] = useState(false);

  // Initialize G1 heap with regions
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalRegions = gridSize * gridSize;
    const newRegions: Region[] = [];
    
    for (let i = 0; i < totalRegions; i++) {
      const cells: MemoryCell[] = [];
      const cellsPerRegion = regionSize * regionSize;
      
      for (let j = 0; j < cellsPerRegion; j++) {
        cells.push({
          state: CellState.FREE,
          survivedCycles: 0,
          id: i * cellsPerRegion + j,
          regionId: i
        });
      }
      
      newRegions.push({
        id: i,
        type: RegionType.UNASSIGNED,
        cells,
        occupancy: 0
      });
    }
    
    // Assign initial regions: only 1 Eden, rest unassigned
    if (newRegions.length >= 1) {
      const randomIndex = Math.floor(Math.random() * newRegions.length);
      newRegions[randomIndex].type = RegionType.EDEN;
    }
    
    setRegions(newRegions);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
    setCurrentEdenRegions(1);
  };

  const getAvailableEdenRegion = () => {
    return regions.find(r => 
      r.type === RegionType.EDEN && 
      r.cells.some(c => c.state === CellState.FREE)
    );
  };

  const assignNewEdenRegion = () => {
    if (currentEdenRegions >= maxEdenRegions) return null;
    const unassigned = regions.filter(r => r.type === RegionType.UNASSIGNED);
    if (unassigned.length > 0) {
      const chosen = unassigned[Math.floor(Math.random() * unassigned.length)];
      setRegions(prev =>
        prev.map(r =>
          r.id === chosen.id
            ? { ...r, type: RegionType.EDEN }
            : r
        )
      );
      setCurrentEdenRegions(prev => prev + 1);
      return chosen.id;
    }
    return null;
  };

  const calculateOccupancy = (cells: MemoryCell[]) => {
    const occupiedCells = cells.filter(c => 
      c.state === CellState.REFERENCED || 
      c.state === CellState.SURVIVED ||
      c.state === CellState.MARKED
    ).length;
    return Math.round((occupiedCells / cells.length) * 100);
  };

  const simulateAllocation = () => {
    let createdEden = false;
    setRegions(prev => {
      // deep-ish clone for safe mutations
      const newRegions = prev.map(r => ({
        ...r,
        cells: r.cells.map(c => ({ ...c })),
      }));

      const edenCount = newRegions.filter(r => r.type === RegionType.EDEN).length;

      const findAvailableEden = () =>
        newRegions.find((r) => r.type === RegionType.EDEN && r.cells.some((c) => c.state === CellState.FREE));

      let edenRegion = findAvailableEden();

      // If no available Eden region, assign a new one randomly (up to maxEdenRegions)
      if (!edenRegion && edenCount < maxEdenRegions) {
        const unassigned = newRegions.filter((r) => r.type === RegionType.UNASSIGNED);
        if (unassigned.length > 0) {
          const chosen = unassigned[Math.floor(Math.random() * unassigned.length)];
          chosen.type = RegionType.EDEN;
          chosen.occupancy = 0;
          chosen.cells = chosen.cells.map((c) => ({ ...c, state: CellState.FREE, survivedCycles: 0 }));
          createdEden = true;
          edenRegion = chosen;
        }
      }

      if (!edenRegion) {
        // All Eden regions are full and we can't create more yet
        return newRegions;
      }

      const regionIndex = newRegions.findIndex((r) => r.id === edenRegion!.id);
      const freeCells = edenRegion!.cells.filter((c) => c.state === CellState.FREE);

      if (freeCells.length > 0) {
        // Allocate 3-5 new objects
        const allocateCount = Math.min(Math.floor(Math.random() * 3) + 3, freeCells.length);

        const updatedCells = [...edenRegion!.cells];
        for (let i = 0; i < allocateCount; i++) {
          const cellIndex = updatedCells.findIndex((c) => c.state === CellState.FREE);
          if (cellIndex !== -1) {
            updatedCells[cellIndex] = {
              ...updatedCells[cellIndex],
              state: CellState.REFERENCED,
            };
          }
        }

        // Increase mortality in Eden: 55-85% of referenced become dereferenced
        // But ensure at least 20% remain alive (minimum 1 cell)
        const referencedCells = updatedCells.filter((c) => c.state === CellState.REFERENCED);
        const minAliveCells = Math.max(1, Math.ceil(referencedCells.length * 0.2));
        const maxToDeref = Math.max(0, referencedCells.length - minAliveCells);
        const dereferenceTarget = Math.min(maxToDeref, Math.floor(referencedCells.length * (0.55 + Math.random() * 0.3)));
        
        for (let i = 0; i < dereferenceTarget && referencedCells.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * referencedCells.length);
          const cellToDeref = referencedCells.splice(randomIndex, 1)[0];
          const cellIndex = updatedCells.findIndex((c) => c.id === cellToDeref.id);
          if (cellIndex !== -1) {
            updatedCells[cellIndex] = {
              ...updatedCells[cellIndex],
              state: CellState.DEREFERENCED,
            };
          }
        }

        const newOcc = calculateOccupancy(updatedCells);
        newRegions[regionIndex] = {
          ...edenRegion!,
          cells: updatedCells,
          occupancy: newOcc,
        };

        // If this Eden just ran out of FREE cells, immediately create a new Eden (random unassigned) up to maxEdenRegions
        const hasFreeAfter = updatedCells.some((c) => c.state === CellState.FREE);
        if (!hasFreeAfter) {
          const currentEdenCount = newRegions.filter((r) => r.type === RegionType.EDEN).length;
          if (currentEdenCount < maxEdenRegions) {
            const unassignedNow = newRegions.filter((r) => r.type === RegionType.UNASSIGNED);
            if (unassignedNow.length > 0) {
              const chosen = unassignedNow[Math.floor(Math.random() * unassignedNow.length)];
              chosen.type = RegionType.EDEN;
              chosen.occupancy = 0;
              chosen.cells = chosen.cells.map((c) => ({ ...c, state: CellState.FREE, survivedCycles: 0 }));
              createdEden = true;
            }
          }
        }
      }

      return newRegions;
    });

    if (createdEden) setCurrentEdenRegions((prev) => prev + 1);
  };

  const simulateMarking = () => {
    setRegions(prev => {
      const newRegions = [...prev];

      // Determine if we are targeting specific Eden regions (shouldCollect)
      const targetedEdens = newRegions.filter(r => r.type === RegionType.EDEN && r.shouldCollect);
      const targetedMode = targetedEdens.length > 0;
      const targetIds = new Set(targetedEdens.map(r => r.id));
      
      // During STW, no new garbage is created - only mark live objects
      newRegions.forEach(region => {
        region.cells.forEach(cell => {
          if (targetedMode) {
            if (region.type === RegionType.EDEN && targetIds.has(region.id)) {
              if (
                cell.state === CellState.REFERENCED ||
                (cell.state === CellState.SURVIVED && cell.survivedCycles > 0)
              ) {
                cell.state = CellState.MARKED;
              }
            }
          } else {
            if (
              cell.state === CellState.REFERENCED ||
              (cell.state === CellState.SURVIVED && cell.survivedCycles > 0)
            ) {
              cell.state = CellState.MARKED;
            }
          }
        });
        
        region.occupancy = calculateOccupancy(region.cells);
      });
      
      return newRegions;
    });
  };

  const simulateEvacuation = () => {
    setRegions(prev => {
      const newRegions = [...prev];
      const edenRegions = newRegions.filter((r) => r.type === RegionType.EDEN && r.shouldCollect);
      let survivorRegions = newRegions.filter((r) => r.type === RegionType.SURVIVOR);

      // Create Survivor regions dynamically if needed (up to 2)
      const markedFromEden = edenRegions.flatMap(r => r.cells.filter(c => c.state === CellState.MARKED));
      const survivorsNeeded = Math.min(2, Math.ceil(markedFromEden.length / 16));
      
      while (survivorRegions.length < survivorsNeeded) {
        const unassigned = newRegions.filter(r => r.type === RegionType.UNASSIGNED);
        if (unassigned.length === 0) break;
        
        const chosen = unassigned[Math.floor(Math.random() * unassigned.length)];
        chosen.type = RegionType.SURVIVOR;
        chosen.occupancy = 0;
        chosen.cells = chosen.cells.map(c => ({ ...c, state: CellState.FREE, survivedCycles: 0 }));
        survivorRegions.push(chosen);
      }

      if (survivorRegions.length === 0) return newRegions;

      // Collect all marked objects from Eden regions
      let markedFromEdenList: MemoryCell[] = [];
      edenRegions.forEach((region) => {
        markedFromEdenList = markedFromEdenList.concat(region.cells.filter((c) => c.state === CellState.MARKED));
      });

      // Destination free cells across all survivors
      const survivorFreeCells = survivorRegions.flatMap((sr) =>
        sr.cells.filter((c) => c.state === CellState.FREE).map((c) => ({ regionId: sr.id, cell: c }))
      );

      let destIndex = 0;

      // Evacuate Eden objects into Survivors (fill-first)
      markedFromEdenList.forEach((obj) => {
        if (destIndex < survivorFreeCells.length) {
          const { regionId, cell: targetCell } = survivorFreeCells[destIndex];
          const sRegion = newRegions.find((r) => r.id === regionId)!;
          const targetIndex = sRegion.cells.findIndex((c) => c.id === targetCell.id);
          if (targetIndex !== -1) {
            sRegion.cells[targetIndex] = {
              ...targetCell,
              state: CellState.COPYING,
              survivedCycles: 1,
            };
            destIndex++;
          }
        }
      });

      // Clear Eden regions and mark as UNASSIGNED (gray)
      edenRegions.forEach((region) => {
        const regionIndex = newRegions.findIndex((r) => r.id === region.id);
        newRegions[regionIndex] = {
          ...region,
          type: RegionType.UNASSIGNED, // Back to gray/unassigned
          cells: region.cells.map((c) => ({
            ...c,
            state: CellState.FREE,
            survivedCycles: 0,
          })),
          occupancy: 0,
          shouldCollect: false,
        };
      });
      
      // Clear shouldCollect flag from all regions
      newRegions.forEach(region => {
        if (region.shouldCollect) {
          region.shouldCollect = false;
        }
      });

      // Update occupancies
      survivorRegions.forEach((sr) => {
        const idx = newRegions.findIndex((r) => r.id === sr.id);
        newRegions[idx] = {
          ...newRegions[idx],
          occupancy: calculateOccupancy(newRegions[idx].cells),
        };
      });

      const edenCount = newRegions.filter((r) => r.type === RegionType.EDEN).length;
      setCurrentEdenRegions(edenCount);
      return newRegions;
    });
  };

  const finalizeCopyPhase = () => {
    setRegions((prev) => {
      const newRegions = [...prev];

      // Finalize all copying operations
      newRegions.forEach((region) => {
        region.cells.forEach((cell) => {
          if (cell.state === CellState.COPYING) {
            cell.state = CellState.SURVIVED;
          }
        });

        region.occupancy = calculateOccupancy(region.cells);
      });

      return newRegions;
    });
  };

  const nextStep = () => {
    if (phase === 'complete') return;

    setCurrentStep((prev) => prev + 1);

    if (phase === 'allocating') {
      const edenRegions = regions.filter((r) => r.type === RegionType.EDEN);
      const survivors = regions.filter((r) => r.type === RegionType.SURVIVOR);

      // Eden STW trigger: 6 Eden regions and none has FREE cells
      const allSixEdenFull =
        edenRegions.length >= maxEdenRegions &&
        edenRegions.every((r) => r.cells.every((c) => c.state !== CellState.FREE));

      // Check if both survivors are full (no FREE cells)
      const survivorsCount = survivors.length;
      const survivorsBothFull = survivorsCount >= maxSurvivorRegions && 
        survivors.every((r) => r.cells.every((c) => c.state !== CellState.FREE));

      if (survivorsBothFull) {
        setGcCycles((prev) => prev + 1);
        toast.info(`G1 GC: Ambos Survivors llenos • Promoviendo a Tenured • Cycle #${gcCycles + 1}`);
        setPhase('mixed-gc');
      } else if (allSixEdenFull) {
        // Mark only the 2 Eden regions with most garbage for collection
        setRegions(prev => {
          const newRegions = [...prev];
          const edenRegions = newRegions.filter(r => r.type === RegionType.EDEN);
          
          // Calculate garbage count (dereferenced cells) for each Eden region
          const edenWithGarbage = edenRegions.map(region => ({
            region,
            garbageCount: region.cells.filter(c => c.state === CellState.DEREFERENCED).length
          }));
          
          // Sort by garbage count (descending) and take top 2
          const topTwoGarbageRegions = edenWithGarbage
            .sort((a, b) => b.garbageCount - a.garbageCount)
            .slice(0, 2);
          
          // Mark only these 2 regions for collection
          topTwoGarbageRegions.forEach(({ region }) => {
            const regionIndex = newRegions.findIndex(r => r.id === region.id);
            if (regionIndex !== -1) {
              newRegions[regionIndex] = { ...newRegions[regionIndex], shouldCollect: true };
            }
          });
          
          return newRegions;
        });
        
        setGcCycles((prev) => prev + 1);
        toast.info(`G1 GC: Recolectando las 2 zonas Eden con más basura • Cycle #${gcCycles + 1}`);
        setPhase('marking');
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      simulateMarking();
      if (isRunning) {
        setTimeout(() => {
          setPhase('evacuating');
          toast.info("G1 GC: Marcado completado - Evacuando objetos vivos a Survivors");
        }, 1200);
      } else {
        setPhase('evacuating');
        toast.info("G1 GC: Marcado completado - Evacuando objetos vivos a Survivors");
      }
    } else if (phase === 'evacuating') {
      simulateEvacuation();
      if (isRunning) {
        setTimeout(() => {
          finalizeCopyPhase();
          setPhase('allocating');
          toast.success(`G1 GC Cycle #${gcCycles} completado - Eden libre para asignación`);
        }, 1000);
      } else {
        finalizeCopyPhase();
        setPhase('allocating');
        toast.success(`G1 GC Cycle #${gcCycles} completado - Eden libre para asignación`);
      }
    } else if (phase === 'mixed-gc') {
      // Promote from Survivors to Tenured prioritizing the most occupied survivor regions
      setRegions((prev) => {
        const newRegions = [...prev];
        const survivorRegions = newRegions.filter((r) => r.type === RegionType.SURVIVOR);
        let tenuredRegions = newRegions.filter((r) => r.type === RegionType.TENURED);

        if (survivorRegions.length === 0) return newRegions;

        // Create Tenured regions dynamically if needed
        const survivorLiveCells = survivorRegions.flatMap(r => 
          r.cells.filter(c => c.state === CellState.MARKED || c.state === CellState.SURVIVED || c.state === CellState.REFERENCED)
        );
        const tenuredNeeded = Math.min(2, Math.ceil(survivorLiveCells.length / 16));
        
        while (tenuredRegions.length < tenuredNeeded) {
          const unassigned = newRegions.filter(r => r.type === RegionType.UNASSIGNED);
          if (unassigned.length === 0) break;
          
          const chosen = unassigned[Math.floor(Math.random() * unassigned.length)];
          chosen.type = RegionType.TENURED;
          chosen.occupancy = 0;
          chosen.cells = chosen.cells.map(c => ({ ...c, state: CellState.FREE, survivedCycles: 0 }));
          tenuredRegions.push(chosen);
        }

        if (tenuredRegions.length === 0) return newRegions;

        // Sort survivors by occupancy desc to start with the fullest
        const sortedSurvivors = [...survivorRegions].sort((a, b) => b.occupancy - a.occupancy);

        // Build tenured free cells list
        let tenuredFreeCells = tenuredRegions.flatMap(tr =>
          tr.cells
            .filter((c) => c.state === CellState.FREE)
            .map((c) => ({ regionId: tr.id, cell: c }))
        );
        let tIndex = 0;

        // Evacuate live objects (MARKED or SURVIVED) to tenured
        for (const sReg of sortedSurvivors) {
          const sRegionRef = newRegions.find((r) => r.id === sReg.id)!;
          const liveCells = sRegionRef.cells.filter(
            (c) => c.state === CellState.MARKED || c.state === CellState.SURVIVED || c.state === CellState.REFERENCED
          );

          for (const obj of liveCells) {
            if (tIndex >= tenuredFreeCells.length) break;
            const { regionId, cell: targetCell } = tenuredFreeCells[tIndex];
            const tenuredRef = newRegions.find((r) => r.id === regionId)!;
            const targetIdx = tenuredRef.cells.findIndex((c) => c.id === targetCell.id);
            if (targetIdx !== -1) {
              tenuredRef.cells[targetIdx] = {
                ...targetCell,
                state: CellState.COPYING,
                survivedCycles: 0,
              };
              tIndex++;
            }
            // Clear original cell
            const srcIdx = sRegionRef.cells.findIndex((c) => c.id === obj.id);
            if (srcIdx !== -1) {
              sRegionRef.cells[srcIdx] = {
                ...sRegionRef.cells[srcIdx],
                state: CellState.FREE,
                survivedCycles: 0,
              };
            }
          }

          // Update survivor occupancy after evacuation
          sRegionRef.occupancy = calculateOccupancy(sRegionRef.cells);
        }

        // Update tenured occupancies
        tenuredRegions.forEach(tr => {
          const tenuredIdx = newRegions.findIndex((r) => r.id === tr.id);
          newRegions[tenuredIdx] = {
            ...newRegions[tenuredIdx],
            occupancy: calculateOccupancy(newRegions[tenuredIdx].cells),
          };
        });

        return newRegions;
      });

      if (isRunning) {
        setTimeout(() => {
          finalizeCopyPhase();
          setPhase('allocating');
          toast.success(`Promoción a Tenured completada • Cycle #${gcCycles}`);
        }, 1000);
      } else {
        finalizeCopyPhase();
        setPhase('allocating');
        toast.success(`Promoción a Tenured completada • Cycle #${gcCycles}`);
      }
    }
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    initializeHeap();
    toast.info("G1 GC Simulator reiniciado");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(nextStep, speed);
    }
    return () => clearInterval(interval);
  }, [isRunning, phase, regions, speed]);

  // Reinitialize heap when grid size changes
  useEffect(() => {
    if (!isRunning) {
      initializeHeap();
    }
  }, [gridSize]);

  const getRegionColor = (region: Region) => {
    let baseColor = "";
    switch (region.type) {
      case RegionType.UNASSIGNED:
        baseColor = "bg-muted text-muted-foreground border-muted";
        break;
      case RegionType.EDEN:
        baseColor = "bg-yellow-500 text-yellow-50 border-yellow-600";
        break;
      case RegionType.SURVIVOR:
        baseColor = "bg-orange-500 text-orange-50 border-orange-600";
        break;
      case RegionType.SURVIVOR_FROM:
        baseColor = "bg-orange-500 text-orange-50 border-orange-600";
        break;
      case RegionType.SURVIVOR_TO:
        baseColor = "bg-orange-400 text-orange-50 border-orange-500";
        break;
      case RegionType.TENURED:
        baseColor = "bg-blue-400 text-blue-50 border-blue-500";
        break;
      case RegionType.HUMONGOUS:
        baseColor = "bg-red-500 text-red-50 border-red-600";
        break;
      default:
        baseColor = "bg-muted text-muted-foreground border-muted";
        break;
    }
    
    // Add special styling for regions marked for collection
    if (region.shouldCollect) {
      baseColor += " ring-4 ring-red-400 ring-opacity-80 shadow-lg shadow-red-400/50";
    }
    
    return baseColor;
  };

  const getCellColor = (cell: MemoryCell) => {
    switch (cell.state) {
      case CellState.FREE:
        return "bg-background border-border";
      case CellState.REFERENCED:
        return "bg-primary/80 border-primary";
      case CellState.DEREFERENCED:
        return "bg-destructive/60 border-destructive";
      case CellState.MARKED:
        return "bg-accent border-accent";
      case CellState.SURVIVED:
        return "bg-success/80 border-success";
      case CellState.COPYING:
        return "bg-warning/80 border-warning";
      default:
        return "bg-background border-border";
    }
  };

  const getRegionTypeLabel = (type: RegionType) => {
    switch (type) {
      case RegionType.UNASSIGNED: return "Unassigned";
      case RegionType.EDEN: return "Eden";
      case RegionType.SURVIVOR: return "Survivor";
      case RegionType.SURVIVOR_FROM: return "Survivor From";
      case RegionType.SURVIVOR_TO: return "Survivor To";
      case RegionType.TENURED: return "Tenured";
      case RegionType.HUMONGOUS: return "Humongous";
      default: return "Unknown";
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar 
        gridSize={gridSize}
        setGridSize={setGridSize}
        speed={speed}
        setSpeed={setSpeed}
        isRunning={isRunning}
        onToggleSimulation={toggleSimulation}
        onNextStep={nextStep}
        onReset={reset}
        currentStep={currentStep}
        gcCycles={gcCycles}
        phase={phase}
        collectorType="g1"
      />
      
      <StopTheWorldIndicator 
        phase={phase}
        isVisible={['marking', 'evacuating'].includes(phase)}
      />
      
      <main className="flex-1 p-6">
        <SidebarTrigger />
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold">G1 Garbage Collector</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Eden Regions: {currentEdenRegions}/{maxEdenRegions} • Survivor: {maxSurvivorRegions} • Grid: {gridSize}x{gridSize} regiones
          </p>
        </div>
        
        <Card className="w-full mt-4">
          <CardHeader>
            <CardTitle className="text-center">
              G1 Heap Layout - Regiones Dinámicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="grid gap-2 mx-auto w-fit p-4 bg-muted/10 rounded-lg"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                maxWidth: '48rem',
                width: '100%'
              }}
            >
              {regions.map((region) => (
                <div key={region.id} className="relative">
                  {/* Indicator for regions marked for collection */}
                  {region.shouldCollect && (
                    <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
                      GC
                    </div>
                  )}
                  <div
                    className={`
                      p-1 rounded transition-all duration-300 border-2
                      ${getRegionColor(region)}
                      hover:scale-105 cursor-pointer
                    `}
                    style={{
                      minWidth: `${Math.max(48, 400/gridSize)}px`,
                      minHeight: `${Math.max(48, 400/gridSize)}px`
                    }}
                    title={`Region ${region.id}: ${getRegionTypeLabel(region.type)} (${region.occupancy}% occupied)${region.shouldCollect ? ' - MARCADA PARA LIMPIEZA' : ''}`}
                  >
                    <div 
                      className="grid gap-0"
                      style={{ 
                        gridTemplateColumns: `repeat(${regionSize}, 1fr)`
                      }}
                    >
                      {region.cells.map((cell, cellIndex) => ( // Show all 16 cells
                        <div
                          key={cell.id}
                          className={`
                            aspect-square text-xs flex items-center justify-center rounded-sm border
                            ${getCellColor(cell)}
                          `}
                          style={{
                            minWidth: '8px',
                            minHeight: '8px',
                            fontSize: '6px'
                          }}
                        >
                          {cell.survivedCycles > 0 ? cell.survivedCycles : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};