import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "./AppSidebar";
import { StopTheWorldIndicator } from "./StopTheWorldIndicator";

export enum RegionType {
  UNASSIGNED = "unassigned",
  EDEN = "eden",
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
  const [gridSize, setGridSize] = useState(4); // 4x4 grid of regions
  const [speed, setSpeed] = useState(800);
  const [regionSize] = useState(4); // 4x4 cells per region (16 cells)
  const [currentEdenRegions, setCurrentEdenRegions] = useState(0);
  const maxEdenRegions = 6; // Eden regions (objetivo)
  const maxSurvivorRegions = 2; // Survivor regions (half of Eden)
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
    
    // Assign initial regions randomly: 1 Eden, 1 Survivor From, 1 Survivor To, 1 Tenured
    if (newRegions.length >= 4) {
      const indices = Array.from({ length: newRegions.length }, (_, i) => i);
      const pick = (arr: number[]) => arr.splice(Math.floor(Math.random() * arr.length), 1)[0];
      const edenIdx = pick(indices);
      const sFromIdx = pick(indices);
      const sToIdx = pick(indices);
      const tenuredIdx = pick(indices);
      newRegions[edenIdx].type = RegionType.EDEN;
      newRegions[sFromIdx].type = RegionType.SURVIVOR_FROM;
      newRegions[sToIdx].type = RegionType.SURVIVOR_TO;
      newRegions[tenuredIdx].type = RegionType.TENURED;
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
      r.occupancy < 100
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
        newRegions.find((r) => r.type === RegionType.EDEN && r.occupancy < 100);

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

        // Increase mortality in Eden: 40-70% of referenced become dereferenced
        const referencedCells = updatedCells.filter((c) => c.state === CellState.REFERENCED);
        const dereferenceTarget = Math.floor(referencedCells.length * (0.4 + Math.random() * 0.3));
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

        newRegions[regionIndex] = {
          ...edenRegion!,
          cells: updatedCells,
          occupancy: calculateOccupancy(updatedCells),
        };
      }

      return newRegions;
    });

    if (createdEden) setCurrentEdenRegions((prev) => prev + 1);
  };

  const simulateMarking = () => {
    setRegions(prev => {
      const newRegions = [...prev];
      
      // First, create some dereferenced objects (garbage) 
      newRegions.forEach(region => {
        if (region.type === RegionType.EDEN || region.type === RegionType.SURVIVOR_FROM || region.type === RegionType.SURVIVOR_TO) {
          region.cells.forEach(cell => {
            if (cell.state === CellState.REFERENCED) {
              const p = region.type === RegionType.EDEN ? 0.6 : 0.45; // more garbage to free space
              if (Math.random() < p) {
                cell.state = CellState.DEREFERENCED;
              }
            }
          });
        }
      });
      
      // Then mark all live objects
      newRegions.forEach(region => {
        region.cells.forEach(cell => {
          if (cell.state === CellState.REFERENCED || 
              (cell.state === CellState.SURVIVED && cell.survivedCycles > 0)) {
            cell.state = CellState.MARKED;
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
      const edenRegions = newRegions.filter(r => r.type === RegionType.EDEN);
      const survivorFromRegion = newRegions.find(r => r.type === RegionType.SURVIVOR_FROM);
      const survivorToRegion = newRegions.find(r => r.type === RegionType.SURVIVOR_TO);
      const tenuredRegions = newRegions.filter(r => r.type === RegionType.TENURED);
      
      if (!survivorFromRegion || !survivorToRegion) return newRegions;
      
      // Collect all marked objects from Eden regions
      let markedFromEden: MemoryCell[] = [];
      edenRegions.forEach(region => {
        markedFromEden = markedFromEden.concat(
          region.cells.filter(c => c.state === CellState.MARKED)
        );
      });
      
      // Collect marked objects from Survivor From (older objects)
      const markedFromSurvivor = survivorFromRegion.cells.filter(c => c.state === CellState.MARKED);
      
      // Find available spaces for evacuation
      const survivorToFreeCells = survivorToRegion.cells.filter(c => c.state === CellState.FREE);
      const tenuredFreeCells = tenuredRegions.length > 0 ? 
        tenuredRegions[0].cells.filter(c => c.state === CellState.FREE) : [];
      
      let survivorToIndex = 0;
      let tenuredIndex = 0;
      
      // Evacuate Eden objects to Survivor To
      markedFromEden.forEach(obj => {
        if (survivorToIndex < survivorToFreeCells.length) {
          const targetCell = survivorToFreeCells[survivorToIndex];
          const targetIndex = survivorToRegion.cells.findIndex(c => c.id === targetCell.id);
          if (targetIndex !== -1) {
            survivorToRegion.cells[targetIndex] = {
              ...targetCell,
              state: CellState.COPYING,
              survivedCycles: 1
            };
            survivorToIndex++;
          }
        }
      });
      
      // Evacuate older Survivor objects (promote some to Tenured)
      markedFromSurvivor.forEach(obj => {
        if ((promoteSurvivors || obj.survivedCycles >= 2) && tenuredIndex < tenuredFreeCells.length && tenuredRegions.length > 0) {
          // Promote to Tenured
          const targetCell = tenuredFreeCells[tenuredIndex];
          const tenuredRegion = tenuredRegions[0];
          const targetIndex = tenuredRegion.cells.findIndex(c => c.id === targetCell.id);
          if (targetIndex !== -1) {
            tenuredRegion.cells[targetIndex] = {
              ...targetCell,
              state: CellState.COPYING,
              survivedCycles: 0 // Reset in tenured
            };
            tenuredIndex++;
          }
        } else if (survivorToIndex < survivorToFreeCells.length) {
          // Keep in Survivor space
          const targetCell = survivorToFreeCells[survivorToIndex];
          const targetIndex = survivorToRegion.cells.findIndex(c => c.id === targetCell.id);
          if (targetIndex !== -1) {
            survivorToRegion.cells[targetIndex] = {
              ...targetCell,
              state: CellState.COPYING,
              survivedCycles: obj.survivedCycles + 1
            };
            survivorToIndex++;
          }
        }
      });
      
      // Clear evacuated regions (Eden and Survivor From)
      edenRegions.forEach(region => {
        const regionIndex = newRegions.findIndex(r => r.id === region.id);
        newRegions[regionIndex] = {
          ...region,
          // keep as Eden, just clear cells to reuse
          type: RegionType.EDEN,
          cells: region.cells.map(c => ({
            ...c,
            state: CellState.FREE,
            survivedCycles: 0
          })),
          occupancy: 0
        };
      });
      
      // Clear Survivor From (it becomes the new empty survivor space)
      const survivorFromIndex = newRegions.findIndex(r => r.id === survivorFromRegion.id);
      newRegions[survivorFromIndex] = {
        ...survivorFromRegion,
        cells: survivorFromRegion.cells.map(c => ({
          ...c,
          state: CellState.FREE,
          survivedCycles: 0
        })),
        occupancy: 0
      };
      
      // Update occupancies
      const survivorToIndex2 = newRegions.findIndex(r => r.id === survivorToRegion.id);
      newRegions[survivorToIndex2] = {
        ...survivorToRegion,
        occupancy: calculateOccupancy(survivorToRegion.cells)
      };
      
      if (tenuredRegions.length > 0) {
        const tenuredIndex2 = newRegions.findIndex(r => r.id === tenuredRegions[0].id);
        newRegions[tenuredIndex2] = {
          ...tenuredRegions[0],
          occupancy: calculateOccupancy(tenuredRegions[0].cells)
        };
      }
      
      const edenCount = newRegions.filter(r => r.type === RegionType.EDEN).length;
      setCurrentEdenRegions(edenCount);
      return newRegions;
    });
  };

  const finalizeCopyPhase = () => {
    setRegions(prev => {
      const newRegions = [...prev];
      
      // Finalize all copying operations
      newRegions.forEach(region => {
        region.cells.forEach(cell => {
          if (cell.state === CellState.COPYING) {
            cell.state = CellState.SURVIVED;
          }
        });
        
        region.occupancy = calculateOccupancy(region.cells);
      });
      
      // Swap Survivor spaces (From becomes To, To becomes From)
      const survivorFromRegion = newRegions.find(r => r.type === RegionType.SURVIVOR_FROM);
      const survivorToRegion = newRegions.find(r => r.type === RegionType.SURVIVOR_TO);
      
      if (survivorFromRegion && survivorToRegion) {
        const survivorFromIndex = newRegions.findIndex(r => r.id === survivorFromRegion.id);
        const survivorToIndex = newRegions.findIndex(r => r.id === survivorToRegion.id);
        
        // Swap the types
        newRegions[survivorFromIndex].type = RegionType.SURVIVOR_TO;
        newRegions[survivorToIndex].type = RegionType.SURVIVOR_FROM;
      }
      
      return newRegions;
    });
    setPromoteSurvivors(false);
  };

  const nextStep = () => {
    if (phase === 'complete') return;
    
    setCurrentStep(prev => prev + 1);
    
    if (phase === 'allocating') {
      const edenRegions = regions.filter(r => r.type === RegionType.EDEN);
      const survivors = regions.filter(r => r.type === RegionType.SURVIVOR_FROM || r.type === RegionType.SURVIVOR_TO);
      const edenNearlyFull = edenRegions.filter(r => r.occupancy >= 85).length;
      const survivorsNearlyFull = survivors.some(r => r.occupancy >= 85);

      if (edenNearlyFull >= 6 || survivorsNearlyFull) {
        setGcCycles(prev => prev + 1);
        if (survivorsNearlyFull) setPromoteSurvivors(true);
        toast.info(`G1 GC iniciado - ${survivorsNearlyFull ? 'Survivor casi lleno' : 'Eden casi lleno'} • Cycle #${gcCycles + 1}`);
        setPhase('marking');
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      simulateMarking();
      setTimeout(() => {
        setPhase('evacuating');
        toast.info("G1 GC: Marcado completado - Evacuando objetos vivos");
      }, 1200);
    } else if (phase === 'evacuating') {
      simulateEvacuation();
      setTimeout(() => {
        finalizeCopyPhase();
        setPhase('allocating');
        toast.success(`G1 GC Cycle #${gcCycles} completado - Regiones libres para asignación`);
      }, 1000);
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
    switch (region.type) {
      case RegionType.UNASSIGNED:
        return "bg-muted text-muted-foreground border-muted";
      case RegionType.EDEN:
        return "bg-yellow-500 text-yellow-50 border-yellow-600";
      case RegionType.SURVIVOR_FROM:
        return "bg-orange-500 text-orange-50 border-orange-600";
      case RegionType.SURVIVOR_TO:
        return "bg-orange-400 text-orange-50 border-orange-500";
      case RegionType.TENURED:
        return "bg-blue-400 text-blue-50 border-blue-500";
      case RegionType.HUMONGOUS:
        return "bg-red-500 text-red-50 border-red-600";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
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
                    title={`Region ${region.id}: ${getRegionTypeLabel(region.type)} (${region.occupancy}% occupied)`}
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