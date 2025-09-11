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
  space: 'from' | 'to';
}

export const CopyGCSimulator = () => {
  const [heap, setHeap] = useState<MemoryCell[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'copying' | 'swapping' | 'complete'>('allocating');
  const [gridSize, setGridSize] = useState(15);
  const [speed, setSpeed] = useState(600);
  const [activeSpace, setActiveSpace] = useState<'from' | 'to'>('from');

  // Initialize heap with two spaces
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalCells = gridSize * gridSize;
    const newHeap: MemoryCell[] = [];
    
    // Create From Space (top half) and To Space (bottom half)
    for (let i = 0; i < totalCells; i++) {
      const isFromSpace = i < totalCells / 2;
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: i,
        space: isFromSpace ? 'from' : 'to'
      });
    }
    
    setHeap(newHeap);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
    setActiveSpace('from');
  };

  const simulateAllocation = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const activeSpaceCells = newHeap.filter(cell => 
        cell.space === activeSpace && cell.state === CellState.FREE
      );
      
      if (activeSpaceCells.length === 0) return newHeap;

      // Allocate 3-5 new objects sequentially in active space
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 3, activeSpaceCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const cellToAllocate = activeSpaceCells[i];
        if (cellToAllocate) {
          newHeap[cellToAllocate.id].state = CellState.REFERENCED;
        }
      }

      // Randomly dereference some existing objects in active space
      const referencedCells = newHeap.filter(cell => 
        cell.space === activeSpace && cell.state === CellState.REFERENCED
      );
      const dereferenceCount = Math.floor(Math.random() * 3) + 1;
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
      newHeap.forEach(cell => {
        if (cell.space === activeSpace && (cell.state === CellState.REFERENCED || cell.survivedCycles > 0)) {
          cell.state = CellState.MARKED;
        }
      });
      return newHeap;
    });
    setPhase('marking');
    toast("Marcando objetos en uso...");
    
    // Pause for 1.5s to show marked cells
    setTimeout(() => {
      if (isRunning) {
        simulateCopyPhase();
        setCurrentStep(prev => prev + 1);
      }
    }, 1500);
  };

  const simulateCopyPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const targetSpace = activeSpace === 'from' ? 'to' : 'from';
      
      // Get marked cells from active space
      const markedCells = newHeap.filter(cell => 
        cell.space === activeSpace && cell.state === CellState.MARKED
      );
      
      // Clear the target space
      newHeap.forEach(cell => {
        if (cell.space === targetSpace) {
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        }
      });
      
      // Find free cells in target space
      const targetSpaceCells = newHeap.filter(cell => 
        cell.space === targetSpace && cell.state === CellState.FREE
      );
      
      // Copy marked cells to target space
      markedCells.forEach((markedCell, index) => {
        if (index < targetSpaceCells.length) {
          const targetCell = targetSpaceCells[index];
          newHeap[targetCell.id] = {
            ...markedCell,
            id: targetCell.id,
            space: targetSpace,
            state: CellState.COPYING,
            survivedCycles: markedCell.survivedCycles + 1
          };
        }
      });
      
      // CLEAR ALL CELLS IN THE ACTIVE SPACE (source space) after copying
      newHeap.forEach(cell => {
        if (cell.space === activeSpace) {
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        }
      });
      
      // After a brief moment, change copying cells to survived
      setTimeout(() => {
        setHeap(current => {
          const updated = [...current];
          updated.forEach(cell => {
            if (cell.state === CellState.COPYING) {
              cell.state = CellState.SURVIVED;
            }
          });
          return updated;
        });
      }, 500);
      
      return newHeap;
    });
    setPhase('copying');
    toast(`Copiando objetos vivos de ${activeSpace === 'from' ? 'From' : 'To'} Space a ${activeSpace === 'from' ? 'To' : 'From'} Space...`);
  };

  const simulateSwapSpaces = () => {
    setActiveSpace(prev => prev === 'from' ? 'to' : 'from');
    setPhase('swapping');
    toast("Intercambiando espacios...");
    
    setTimeout(() => {
      setGcCycles(prev => prev + 1);
      if (gcCycles < 3) {
        setPhase('allocating');
        toast(`Ciclo GC ${gcCycles + 1} completado. Continuando en ${activeSpace === 'from' ? 'To' : 'From'} Space...`);
      } else {
        setPhase('complete');
        setIsRunning(false);
        toast("Simulación completada después de 4 ciclos GC");
      }
    }, 500);
  };

  const checkIfActiveSpaceFull = () => {
    const freeCells = heap.filter(cell => 
      cell.space === activeSpace && cell.state === CellState.FREE
    );
    return freeCells.length < 5;
  };

  const nextStep = () => {
    if (phase === 'allocating') {
      if (checkIfActiveSpaceFull()) {
        simulateMarkPhase();
        return; // Don't increment step here, it will be done in the timeout
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      // This is handled by the timeout in simulateMarkPhase
      return;
    } else if (phase === 'copying') {
      simulateSwapSpaces();
    } else if (phase === 'swapping') {
      // Wait for swap to complete
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const toggleSimulation = () => {
    if (phase === 'complete') {
      initializeHeap();
      return;
    }
    setIsRunning(!isRunning);
  };

  // Auto-step when running
  useEffect(() => {
    if (isRunning && phase !== 'complete' && phase !== 'swapping') {
      const timer = setTimeout(nextStep, speed);
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStep, phase, speed]);

  // Reinitialize heap when grid size changes
  useEffect(() => {
    if (!isRunning) {
      initializeHeap();
    }
  }, [gridSize]);

  const getBlueProgression = (survivedCycles: number) => {
    if (survivedCycles === 0) return "bg-gc-blue-fresh";
    if (survivedCycles === 1) return "bg-gc-blue-aging-1";
    if (survivedCycles === 2) return "bg-gc-blue-aging-2";
    if (survivedCycles === 3) return "bg-gc-blue-aging-3";
    return "bg-gc-blue-old";
  };

  const getCellClassName = (cell: MemoryCell) => {
    const baseClass = cell.space === activeSpace ? "ring-2 ring-primary/50" : "opacity-60";
    
    switch (cell.state) {
      case CellState.FREE:
        return `bg-gc-free-cell text-gc-free-cell-foreground border-border ${baseClass}`;
      case CellState.REFERENCED:
        return `${getBlueProgression(cell.survivedCycles)} text-gc-blue-foreground border-border ${baseClass}`;
      case CellState.DEREFERENCED:
        return `bg-gc-dereferenced-cell text-gc-dereferenced-cell-foreground border-border ${baseClass}`;
      case CellState.MARKED:
        return `bg-gc-marked-cell text-gc-marked-cell-foreground border-border ${baseClass}`;
      case CellState.SURVIVED:
        return `${getBlueProgression(cell.survivedCycles)} text-gc-blue-foreground border-border ${baseClass}`;
      case CellState.COPYING:
        return `bg-warning text-warning-foreground border-border animate-pulse ${baseClass}`;
      default:
        return `bg-gc-free-cell text-gc-free-cell-foreground border-border ${baseClass}`;
    }
  };

  const getSpaceLabel = (spaceType: 'from' | 'to') => {
    return spaceType === activeSpace ? 
      `${spaceType === 'from' ? 'From' : 'To'} Space (Active)` : 
      `${spaceType === 'from' ? 'From' : 'To'} Space`;
  };

  return (
    <>
      <AppSidebar
        gridSize={gridSize}
        setGridSize={setGridSize}
        speed={speed}
        setSpeed={setSpeed}
        currentStep={currentStep}
        gcCycles={gcCycles}
        phase={phase}
        isRunning={isRunning}
        onToggleSimulation={toggleSimulation}
        onNextStep={nextStep}
        onReset={initializeHeap}
        collectorType="copy"
        activeSpace={activeSpace}
      />

      <StopTheWorldIndicator 
        phase={phase}
        isVisible={['marking', 'copying'].includes(phase)}
      />

      <main className="flex-1 bg-gradient-bg">
        {/* Header with Sidebar Trigger */}
        <header className="h-16 flex items-center border-b border-border bg-card/50 backdrop-blur-sm">
          <SidebarTrigger className="ml-4" />
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">COPY COLLECTOR</h1>
            <p className="text-sm text-muted-foreground">Demo - Active: {activeSpace === 'from' ? 'From' : 'To'} Space</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-4 h-[calc(100vh-4rem)] flex items-center justify-center">
          <Card className="w-full max-w-2xl lg:max-w-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-lg">
                {phase === 'allocating' ? `Allocating in ${activeSpace === 'from' ? 'From' : 'To'} Space` :
                 phase === 'copying' ? 'Copying Live Objects' :
                 phase === 'swapping' ? 'Swapping Spaces' : 'Memory Spaces'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-4">
              {/* From Space */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-center">{getSpaceLabel('from')}</h3>
                <div 
                  className="grid gap-1 w-full border-2 border-dashed border-muted p-2 rounded mx-auto"
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: gridSize <= 10 ? '32rem' : gridSize <= 15 ? '40rem' : '48rem',
                    width: '100%'
                  }}
                >
                  {heap.filter(cell => cell.space === 'from').map((cell) => (
                    <div
                      key={cell.id}
                      className={`
                        aspect-square border-2 rounded flex items-center justify-center font-bold
                        transition-all duration-500 ${getCellClassName(cell)}
                      `}
                      style={{ 
                        fontSize: gridSize >= 20 ? '0.5rem' : gridSize >= 15 ? '0.625rem' : '0.75rem'
                      }}
                    >
                      {cell.state === CellState.SURVIVED && cell.survivedCycles > 0 
                        ? cell.survivedCycles 
                        : ''
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* To Space */}
              <div>
                <h3 className="text-sm font-medium mb-2 text-center">{getSpaceLabel('to')}</h3>
                <div 
                  className="grid gap-1 w-full border-2 border-dashed border-muted p-2 rounded mx-auto"
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: gridSize <= 10 ? '32rem' : gridSize <= 15 ? '40rem' : '48rem',
                    width: '100%'
                  }}
                >
                  {heap.filter(cell => cell.space === 'to').map((cell) => (
                    <div
                      key={cell.id}
                      className={`
                        aspect-square border-2 rounded flex items-center justify-center font-bold
                        transition-all duration-500 ${getCellClassName(cell)}
                      `}
                      style={{ 
                        fontSize: gridSize >= 20 ? '0.5rem' : gridSize >= 15 ? '0.625rem' : '0.75rem'
                      }}
                    >
                      {cell.state === CellState.SURVIVED && cell.survivedCycles > 0 
                        ? cell.survivedCycles 
                        : ''
                      }
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};