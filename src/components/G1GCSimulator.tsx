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
  const [gridSize, setGridSize] = useState(8); // 8x8 grid of regions
  const [speed, setSpeed] = useState(800);
  const [regionSize, setRegionSize] = useState(4); // 4x4 cells per region
  const [currentEdenRegions, setCurrentEdenRegions] = useState(0);
  const maxEdenRegions = 4;

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
    
    // Assign initial regions
    if (newRegions.length >= 6) {
      newRegions[0].type = RegionType.EDEN; // First Eden region
      newRegions[1].type = RegionType.SURVIVOR_FROM;
      newRegions[2].type = RegionType.SURVIVOR_TO;
      newRegions[3].type = RegionType.TENURED;
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
    
    const unassignedRegion = regions.find(r => r.type === RegionType.UNASSIGNED);
    if (unassignedRegion) {
      setRegions(prev => 
        prev.map(r => 
          r.id === unassignedRegion.id 
            ? { ...r, type: RegionType.EDEN }
            : r
        )
      );
      setCurrentEdenRegions(prev => prev + 1);
      return unassignedRegion.id;
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
    setRegions(prev => {
      const newRegions = [...prev];
      let edenRegion = getAvailableEdenRegion();
      
      // If no available Eden region, try to assign a new one
      if (!edenRegion && currentEdenRegions < maxEdenRegions) {
        const newEdenId = assignNewEdenRegion();
        if (newEdenId !== null) {
          edenRegion = newRegions.find(r => r.id === newEdenId);
        }
      }
      
      if (!edenRegion) {
        // All Eden regions are full, trigger GC
        return newRegions;
      }
      
      const regionIndex = newRegions.findIndex(r => r.id === edenRegion.id);
      const freeCells = edenRegion.cells.filter(c => c.state === CellState.FREE);
      
      if (freeCells.length > 0) {
        // Allocate 2-4 new objects
        const allocateCount = Math.min(
          Math.floor(Math.random() * 3) + 2, 
          freeCells.length
        );
        
        const updatedCells = [...edenRegion.cells];
        for (let i = 0; i < allocateCount; i++) {
          const cellIndex = updatedCells.findIndex(c => c.state === CellState.FREE);
          if (cellIndex !== -1) {
            updatedCells[cellIndex] = {
              ...updatedCells[cellIndex],
              state: CellState.REFERENCED
            };
          }
        }
        
        // Randomly dereference some objects (high mortality in Eden)
        const referencedCells = updatedCells.filter(c => c.state === CellState.REFERENCED);
        const dereferenceCount = Math.floor(Math.random() * 3);
        for (let i = 0; i < Math.min(dereferenceCount, referencedCells.length); i++) {
          const randomIndex = Math.floor(Math.random() * referencedCells.length);
          const cellToDeref = referencedCells[randomIndex];
          const cellIndex = updatedCells.findIndex(c => c.id === cellToDeref.id);
          if (cellIndex !== -1) {
            updatedCells[cellIndex] = {
              ...updatedCells[cellIndex],
              state: CellState.DEREFERENCED
            };
          }
          referencedCells.splice(randomIndex, 1);
        }
        
        newRegions[regionIndex] = {
          ...edenRegion,
          cells: updatedCells,
          occupancy: calculateOccupancy(updatedCells)
        };
      }
      
      return newRegions;
    });
  };

  const simulateMarking = () => {
    setRegions(prev => {
      const newRegions = [...prev];
      
      newRegions.forEach(region => {
        const updatedCells = region.cells.map(cell => {
          // Mark live objects
          if (cell.state === CellState.REFERENCED || 
              (cell.state === CellState.SURVIVED && cell.survivedCycles > 0)) {
            return { ...cell, state: CellState.MARKED };
          }
          return cell;
        });
        
        region.cells = updatedCells;
        region.occupancy = calculateOccupancy(updatedCells);
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
      const tenuredRegion = newRegions.find(r => r.type === RegionType.TENURED);
      
      if (!survivorFromRegion || !survivorToRegion || !tenuredRegion) return newRegions;
      
      // Collect all marked objects from Eden regions
      let markedObjects: MemoryCell[] = [];
      edenRegions.forEach(region => {
        markedObjects = markedObjects.concat(
          region.cells.filter(c => c.state === CellState.MARKED)
        );
      });
      
      // Evacuate to survivor space
      let survivorIndex = 0;
      const survivorFreeCells = survivorToRegion.cells.filter(c => c.state === CellState.FREE);
      
      markedObjects.forEach(obj => {
        if (survivorIndex < survivorFreeCells.length) {
          const targetCell = survivorFreeCells[survivorIndex];
          const targetIndex = survivorToRegion.cells.findIndex(c => c.id === targetCell.id);
          if (targetIndex !== -1) {
            survivorToRegion.cells[targetIndex] = {
              ...targetCell,
              state: CellState.COPYING,
              survivedCycles: (obj.survivedCycles || 0) + 1
            };
            survivorIndex++;
          }
        }
      });
      
      // Clear Eden regions and make them unassigned
      edenRegions.forEach(region => {
        const regionIndex = newRegions.findIndex(r => r.id === region.id);
        newRegions[regionIndex] = {
          ...region,
          type: RegionType.UNASSIGNED,
          cells: region.cells.map(c => ({
            ...c,
            state: CellState.FREE,
            survivedCycles: 0
          })),
          occupancy: 0
        };
      });
      
      // Update occupancy for survivor
      const survivorIndex2 = newRegions.findIndex(r => r.id === survivorToRegion.id);
      newRegions[survivorIndex2] = {
        ...survivorToRegion,
        occupancy: calculateOccupancy(survivorToRegion.cells)
      };
      
      setCurrentEdenRegions(0);
      return newRegions;
    });
  };

  const finalizeCopyPhase = () => {
    setRegions(prev => {
      const newRegions = [...prev];
      
      newRegions.forEach(region => {
        const updatedCells = region.cells.map(cell => {
          if (cell.state === CellState.COPYING) {
            return { ...cell, state: CellState.SURVIVED };
          }
          return cell;
        });
        
        region.cells = updatedCells;
        region.occupancy = calculateOccupancy(updatedCells);
      });
      
      return newRegions;
    });
  };

  const nextStep = () => {
    if (phase === 'complete') return;
    
    setCurrentStep(prev => prev + 1);
    
    if (phase === 'allocating') {
      const edenRegions = regions.filter(r => r.type === RegionType.EDEN);
      const hasAvailableSpace = edenRegions.some(r => r.occupancy < 100) || currentEdenRegions < maxEdenRegions;
      
      if (hasAvailableSpace) {
        simulateAllocation();
      } else {
        // All Eden regions are full, start GC
        setGcCycles(prev => prev + 1);
        toast.info(`Iniciando G1 GC Cycle #${gcCycles + 1}: Marcado`);
        setPhase('marking');
      }
    } else if (phase === 'marking') {
      simulateMarking();
      setTimeout(() => {
        setPhase('evacuating');
        toast.info("G1 GC: Evacuando objetos vivos");
      }, 1000);
    } else if (phase === 'evacuating') {
      simulateEvacuation();
      setTimeout(() => {
        finalizeCopyPhase();
        setPhase('allocating');
        toast.success(`G1 GC Cycle #${gcCycles} completado`);
      }, 800);
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
            Eden Regions: {currentEdenRegions}/{maxEdenRegions} • Grid: {gridSize}x{gridSize} regions
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
                    <div className="text-xs font-bold mb-1 text-center">
                      {getRegionTypeLabel(region.type)}
                    </div>
                    <div className="text-xs text-center mb-1">
                      {region.occupancy}%
                    </div>
                    <div 
                      className="grid gap-0"
                      style={{ 
                        gridTemplateColumns: `repeat(${regionSize}, 1fr)`
                      }}
                    >
                      {region.cells.slice(0, 8).map((cell, cellIndex) => ( // Show first 8 cells as preview
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