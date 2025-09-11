import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "./AppSidebar";
import { StopTheWorldIndicator } from "./StopTheWorldIndicator";

export enum CellState {
  FREE = "free",
  REFERENCED = "referenced", 
  DEREFERENCED = "dereferenced",
  MARKED = "marked",
  SURVIVED = "survived",
  COPYING = "copying"
}

export interface MemoryCell {
  state: CellState;
  survivedCycles: number;
  id: number;
  space: 'eden' | 'survivor-from' | 'survivor-to' | 'tenured';
}

export const GenerationalGCSimulator = () => {
  const [heap, setHeap] = useState<MemoryCell[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'copying-survivor' | 'copying-tenured' | 'swapping' | 'major-gc-marking' | 'major-gc-compacting' | 'complete'>('allocating');
  const [edenSize, setEdenSize] = useState(6); // Eden size in cells (width)
  const [speed, setSpeed] = useState(600);
  const [activeSurvivorSpace, setActiveSurvivorSpace] = useState<'survivor-from' | 'survivor-to'>('survivor-from');
  
  const [tenureThreshold, setTenureThreshold] = useState(3); // cycles to move to tenured

  // Calculate proportional sizes based on Eden
  const calculateGridSizes = () => {
    // Eden ~20%, Survivor ~30%, Tenured ~50% of total space
    const survivorSize = Math.max(2, Math.floor(edenSize * 1.5)); // 150% of Eden (30%/20% = 1.5)
    const tenuredSize = Math.max(4, Math.floor(edenSize * 2.5)); // 250% of Eden (50%/20% = 2.5)
    const totalWidth = edenSize + survivorSize + tenuredSize;
    const totalHeight = Math.max(8, Math.floor(totalWidth * 0.8)); // Maintain reasonable aspect ratio
    
    return {
      edenCols: edenSize,
      survivorCols: survivorSize,
      tenuredCols: tenuredSize,
      gridSize: totalWidth,
      gridHeight: totalHeight
    };
  };

  // Initialize heap with four spaces
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const { edenCols, survivorCols, tenuredCols, gridSize, gridHeight } = calculateGridSizes();
    const totalCells = gridSize * gridHeight;
    const newHeap: MemoryCell[] = [];
    
    const survivorRows = Math.floor(gridHeight / 2); // Half rows for each survivor space
    
    // Initialize all cells first
    for (let i = 0; i < totalCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: i,
        space: 'eden' // default, will be reassigned
      });
    }
    
    // Assign spaces based on position
    for (let row = 0; row < gridHeight; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellId = row * gridSize + col;
        
        if (col < edenCols) {
          // Eden Space (leftmost columns)
          newHeap[cellId].space = 'eden';
        } else if (col < edenCols + survivorCols) {
          // Survivor Space (middle columns)
          if (row < survivorRows) {
            newHeap[cellId].space = 'survivor-from'; // Top half
          } else {
            newHeap[cellId].space = 'survivor-to'; // Bottom half
          }
        } else {
          // Tenured Space (rightmost columns)
          newHeap[cellId].space = 'tenured';
        }
      }
    }
    
    setHeap(newHeap);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
    setActiveSurvivorSpace('survivor-from');
  };

  const simulateAllocation = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const edenCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.FREE
      );
      
      if (edenCells.length === 0) return newHeap;

      // Allocate 4-6 new objects in Eden space
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 4, edenCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const cellToAllocate = edenCells[i];
        if (cellToAllocate) {
          newHeap[cellToAllocate.id].state = CellState.REFERENCED;
        }
      }

      // Randomly dereference many objects in Eden (high mortality rate)
      const referencedCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.REFERENCED
      );
      const dereferenceCount = Math.floor(Math.random() * 4) + 2; // More aggressive dereferencing
      for (let i = 0; i < Math.min(dereferenceCount, referencedCells.length); i++) {
        const randomIndex = Math.floor(Math.random() * referencedCells.length);
        const cellToDereference = referencedCells.splice(randomIndex, 1)[0];
        if (cellToDereference) {
          newHeap[cellToDereference.id].state = CellState.DEREFERENCED;
        }
      }

      return newHeap;
    });
  };

  const simulateMarkPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      
      // Dereference some survived objects across all spaces during marking phase
      newHeap.forEach(cell => {
        // Eden space: objects that were referenced can lose references
        if (cell.space === 'eden' && cell.state === CellState.REFERENCED) {
          if (Math.random() < 0.25) { // 25% chance in Eden (high mortality)
            cell.state = CellState.DEREFERENCED;
            cell.survivedCycles = 0;
          }
        }
        
        // Survivor spaces: survived objects can become garbage
        if ((cell.space === 'survivor-from' || cell.space === 'survivor-to') && cell.state === CellState.SURVIVED) {
          if (Math.random() < 0.20) { // 20% chance in survivor spaces
            cell.state = CellState.DEREFERENCED;
            cell.survivedCycles = 0;
          }
        }
        
        // Tenured space: even old objects can become garbage (accumulate until Major GC)
        if (cell.space === 'tenured' && cell.state === CellState.SURVIVED) {
          if (Math.random() < 0.12) { // 12% chance in tenured - they accumulate
            cell.state = CellState.DEREFERENCED;
            cell.survivedCycles = 0;
          }
        }
      });
      
      // Mark reachable/live objects (objects that are still referenced or have survived cycles)
      newHeap.forEach(cell => {
        if (cell.state === CellState.REFERENCED || 
           (cell.state === CellState.SURVIVED && cell.survivedCycles > 0)) {
          cell.state = CellState.MARKED;
        }
      });
      
      return newHeap;
    });
  };

  const simulateCopyToSurvivor = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const markedEdenCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.MARKED
      );

      const availableSurvivorCells = newHeap.filter(cell => 
        cell.space === activeSurvivorSpace && cell.state === CellState.FREE
      );

      const availableTenuredCells = newHeap.filter(cell => 
        cell.space === 'tenured' && cell.state === CellState.FREE
      );

      let survivorIndex = 0;
      let tenuredIndex = 0;

      markedEdenCells.forEach(markedCell => {
        if (survivorIndex < availableSurvivorCells.length) {
          // Hay espacio en survivor - mover ahí
          const targetCell = availableSurvivorCells[survivorIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: (markedCell.survivedCycles || 0) + 1,
            id: targetCell.id,
            space: activeSurvivorSpace
          };
        } else if (tenuredIndex < availableTenuredCells.length) {
          // Survivor lleno - mover directamente a tenured
          const targetCell = availableTenuredCells[tenuredIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: 0, // Reset counter en tenured
            id: targetCell.id,
            space: 'tenured'
          };
        }
        // Si no hay espacio ni en survivor ni en tenured, el objeto se pierde (no debería pasar)
      });

      // Clear Eden space
      newHeap.forEach(cell => {
        if (cell.space === 'eden') {
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        }
      });

      return newHeap;
    });
  };

  const simulateCopyBetweenSurvivors = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const sourceSpace = activeSurvivorSpace === 'survivor-from' ? 'survivor-to' : 'survivor-from';
      const sourceMarked = newHeap.filter(cell => 
        cell.space === sourceSpace && cell.state === CellState.MARKED
      );
      
      const availableActiveCells = newHeap.filter(cell => 
        cell.space === activeSurvivorSpace && cell.state === CellState.FREE
      );
      
      const tenuredCells = newHeap.filter(cell => 
        cell.space === 'tenured' && cell.state === CellState.FREE
      );

      let activeIndex = 0;
      let tenuredIndex = 0;

      sourceMarked.forEach(markedCell => {
        const nextCycles = (markedCell.survivedCycles || 0) + 1;
        if (nextCycles >= tenureThreshold && tenuredIndex < tenuredCells.length) {
          // Promoción a Tenured si alcanza el umbral
          const targetCell = tenuredCells[tenuredIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: 0,
            id: targetCell.id,
            space: 'tenured'
          };
        } else if (activeIndex < availableActiveCells.length) {
          // Mover a Survivor si hay hueco real
          const targetCell = availableActiveCells[activeIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: nextCycles,
            id: targetCell.id,
            space: activeSurvivorSpace
          };
        } else if (tenuredIndex < tenuredCells.length) {
          // Overflow a Tenured si Survivor está lleno
          const targetCell = tenuredCells[tenuredIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: 0,
            id: targetCell.id,
            space: 'tenured'
          };
        }
      });

      // Mark the source (inactive) survivor space as deallocated to visualize cleaning
      newHeap.forEach(cell => {
        if (cell.space === sourceSpace) {
          cell.state = CellState.DEREFERENCED;
          cell.survivedCycles = 0;
        }
      });

      return newHeap;
    });
  };

  const finalizeCopyPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      newHeap.forEach(cell => {
        if (cell.state === CellState.COPYING) {
          cell.state = CellState.SURVIVED;
        } else if (cell.state === CellState.DEREFERENCED && (cell.space === 'survivor-from' || cell.space === 'survivor-to')) {
          // Clean deallocated positions each cycle in Survivor spaces only
          cell.state = CellState.FREE;
        }
        // IMPORTANT: Tenured DEREFERENCED cells are NOT cleaned here - they accumulate until Major GC
      });
      return newHeap;
    });
  };

  const simulateMajorGCMarking = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      // Mark live objects in Tenured space during Major GC
      newHeap.forEach(cell => {
        if (cell.space === 'tenured') {
          if (cell.state === CellState.SURVIVED) {
            // Mark live objects
            cell.state = CellState.MARKED;
          }
          // DEREFERENCED cells remain as DEREFERENCED (garbage to be collected)
        }
      });
      return newHeap;
    });
  };

  const simulateMajorGCCompacting = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const tenuredCells = newHeap.filter(cell => cell.space === 'tenured');
      const markedTenured = tenuredCells.filter(cell => cell.state === CellState.MARKED);
      
      // Clear all tenured space first (this frees both SURVIVED and DEREFERENCED)
      tenuredCells.forEach(cell => {
        cell.state = CellState.FREE;
        cell.survivedCycles = 0;
      });
      
      // Compact marked objects to the beginning of Tenured space
      markedTenured.forEach((markedCell, index) => {
        if (index < tenuredCells.length) {
          const targetCell = tenuredCells[index];
          newHeap[targetCell.id] = {
            state: CellState.SURVIVED,
            survivedCycles: 0, // Reset counter in Tenured (as specified)
            id: targetCell.id,
            space: 'tenured'
          };
        }
      });
      
      return newHeap;
    });
  };

  const nextStep = () => {
    if (phase === 'complete') return;

    setCurrentStep(prev => prev + 1);

    if (phase === 'allocating') {
      const edenHasSpace = heap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.FREE
      ).length >= 3;

      if (edenHasSpace) {
        simulateAllocation();
      } else {
        // Check if Tenured is full (no free space) before Minor GC
        const tenuredFreeSpace = heap.filter(cell => 
          cell.space === 'tenured' && cell.state === CellState.FREE
        ).length;
        
        if (tenuredFreeSpace === 0) {
          // Tenured is full - trigger Major GC (deallocated cells have accumulated)
          toast.info(`Major GC iniciado - Tenured Space lleno (celdas deallocated acumuladas)`);
          setPhase('major-gc-marking');
          return;
        }

        // Normal Minor GC flow
        setActiveSurvivorSpace(prev => (prev === 'survivor-from' ? 'survivor-to' : 'survivor-from'));
        setGcCycles(prev => prev + 1);
        toast.info(`Iniciando ciclo GC #${gcCycles + 1}: swap de Survivor y fase de marcado`);
        setPhase('marking');
      }
    } else if (phase === 'major-gc-marking') {
      simulateMajorGCMarking();
      setTimeout(() => {
        setPhase('major-gc-compacting');
        toast.info("Major GC: Compactando Tenured Space");
      }, 1500);
    } else if (phase === 'major-gc-compacting') {
      simulateMajorGCCompacting();
      setTimeout(() => {
        setPhase('allocating');
        toast.success("Major GC completado - Tenured Space compactado");
      }, 1200);
    } else if (phase === 'marking') {
      simulateMarkPhase();
      // Pause to visualize MARKED cells
      setTimeout(() => {
        setPhase('copying-survivor');
        toast.info("Copiando vivos de Eden → Survivor ACTIVO");
      }, 1500);
    } else if (phase === 'copying-survivor') {
      simulateCopyToSurvivor();
      setTimeout(() => {
        setPhase('copying-tenured');
        toast.info("Copiando vivos de Survivor INACTIVO → ACTIVO / Promociones");
      }, 800);
    } else if (phase === 'copying-tenured') {
      simulateCopyBetweenSurvivors();
      setTimeout(() => {
        setPhase('swapping');
        toast.info("Finalizando copia y limpieza");
      }, 800);
    } else if (phase === 'swapping') {
      finalizeCopyPhase();
      setPhase('allocating');
      toast.success(`Ciclo GC #${gcCycles} completado`);
    }
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    initializeHeap();
    toast.info("Simulación reiniciada");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(nextStep, speed);
    }
    return () => clearInterval(interval);
  }, [isRunning, phase, heap, speed]);

  // Reinitialize heap when eden size changes
  useEffect(() => {
    if (!isRunning) {
      initializeHeap();
    }
  }, [edenSize]);

  const getBlueProgression = (survivedCycles: number) => {
    if (survivedCycles === 0) return "bg-gc-blue-fresh";
    if (survivedCycles === 1) return "bg-gc-blue-aging-1";
    if (survivedCycles === 2) return "bg-gc-blue-aging-2";
    if (survivedCycles === 3) return "bg-gc-blue-aging-3";
    return "bg-gc-blue-old";
  };

  const getCellColor = (cell: MemoryCell) => {
    switch (cell.state) {
      case CellState.FREE:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
      case CellState.REFERENCED:
        return `${getBlueProgression(cell.survivedCycles)} text-gc-blue-foreground border-border`;
      case CellState.DEREFERENCED:
        return "bg-gc-dereferenced-cell text-gc-dereferenced-cell-foreground border-border";
      case CellState.MARKED:
        return "bg-gc-marked-cell text-gc-marked-cell-foreground border-border";
      case CellState.SURVIVED:
        return `${getBlueProgression(cell.survivedCycles)} text-gc-blue-foreground border-border`;
      case CellState.COPYING:
        return "bg-warning text-warning-foreground border-border animate-pulse";
      default:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
    }
  };

  const getCellBorder = (cell: MemoryCell, index: number) => {
    const { edenCols, survivorCols, tenuredCols, gridSize, gridHeight } = calculateGridSizes();
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const survivorRows = Math.floor(gridHeight / 2);
    
    let borderClasses = "border";
    
    // Eden Space borders
    if (cell.space === 'eden') {
      borderClasses += " border-primary";
      if (col === 0) borderClasses += " border-l-4"; // Left border of Eden
      if (col === edenCols - 1) borderClasses += " border-r-4"; // Right border of Eden
      if (row === 0) borderClasses += " border-t-4"; // Top border of Eden
      if (row === gridHeight - 1) borderClasses += " border-b-4"; // Bottom border of Eden
    }
    // Survivor From borders
    else if (cell.space === 'survivor-from') {
      borderClasses += " border-accent";
      if (col === edenCols) borderClasses += " border-l-4"; // Left border of Survivor
      if (col === edenCols + survivorCols - 1) borderClasses += " border-r-4"; // Right border of Survivor
      if (row === 0) borderClasses += " border-t-4"; // Top border of Survivor area
      if (row === survivorRows - 1) borderClasses += " border-b-4"; // Divider between From/To
    }
    // Survivor To borders
    else if (cell.space === 'survivor-to') {
      borderClasses += " border-ring";
      if (col === edenCols) borderClasses += " border-l-4"; // Left border of Survivor
      if (col === edenCols + survivorCols - 1) borderClasses += " border-r-4"; // Right border of Survivor
      if (row === survivorRows) borderClasses += " border-t-4"; // Divider between From/To
      if (row === gridHeight - 1) borderClasses += " border-b-4"; // Bottom border of Survivor area
    }
    // Tenured borders
    else if (cell.space === 'tenured') {
      borderClasses += " border-destructive";
      if (col === edenCols + survivorCols) borderClasses += " border-l-4"; // Left border of Tenured
      if (col === gridSize - 1) borderClasses += " border-r-4"; // Right border of Tenured
      if (row === 0) borderClasses += " border-t-4"; // Top border of Tenured
      if (row === gridHeight - 1) borderClasses += " border-b-4"; // Bottom border of Tenured
    }
    
    return borderClasses;
  };

  const getSpaceLabel = (index: number) => {
    const { edenCols, survivorCols, tenuredCols, gridSize, gridHeight } = calculateGridSizes();
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const survivorRows = Math.floor(gridHeight / 2);
    
    // Show labels at the top of each zone
    if (row === 0) {
      if (col === 0) return "Eden Space";
      if (col === edenCols) return "Survivor From";
      if (col === edenCols + survivorCols) return "Tenured Space";
    }
    // Show Survivor To label at the middle row
    if (row === survivorRows && col === edenCols) return "Survivor To";
    
    return "";
  };

  const { gridSize, gridHeight } = calculateGridSizes();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar 
        gridSize={edenSize}
        setGridSize={setEdenSize}
        speed={speed}
        setSpeed={setSpeed}
        isRunning={isRunning}
        onToggleSimulation={toggleSimulation}
        onNextStep={nextStep}
        onReset={reset}
        currentStep={currentStep}
        gcCycles={gcCycles}
        phase={phase}
        tenureThreshold={tenureThreshold}
        setTenureThreshold={setTenureThreshold}
        collectorType="generational"
      />
      
      <StopTheWorldIndicator 
        phase={phase}
        isVisible={['marking', 'copying-survivor', 'copying-tenured', 'major-gc-marking', 'major-gc-compacting'].includes(phase)}
      />
      
      <main className="flex-1 p-6">
          <SidebarTrigger />
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold">Generational Garbage Collector</h1>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              Memoria del Heap - Generational GC (Eden: {edenSize} celdas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="grid gap-0 mx-auto w-fit p-4 bg-muted/20 rounded-lg"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                maxWidth: gridSize <= 10 ? '28rem' : gridSize <= 15 ? '36rem' : '48rem',
                width: '100%',
                aspectRatio: `${gridSize}/${gridHeight}`
              }}
            >
              {heap.map((cell, index) => {
                const label = getSpaceLabel(index);
                const borderClasses = getCellBorder(cell, index);
                return (
                  <div key={cell.id} className="relative">
                    {label && (
                      <div className="absolute -top-7 left-0 text-xs font-bold text-foreground whitespace-nowrap z-10 bg-background px-2 py-1 rounded shadow-sm border-2 border-current">
                        {label}
                      </div>
                    )}
                    <div
                      className={`
                        aspect-square transition-all duration-300 flex items-center justify-center text-xs font-semibold
                        ${getCellColor(cell)} ${borderClasses}
                        hover:scale-110 cursor-pointer
                      `}
                      style={{
                        minWidth: `${Math.max(16, 480/gridSize)}px`,
                        minHeight: `${Math.max(16, 480/gridHeight)}px`
                      }}
                      title={`Celda ${cell.id}: ${cell.state} (Ciclos: ${cell.survivedCycles}) - ${cell.space}`}
                    >
                      {cell.survivedCycles > 0 ? cell.survivedCycles : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};