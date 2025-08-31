import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { toast } from "sonner";

export enum CellState {
  FREE = "free",
  REFERENCED = "referenced", 
  DEREFERENCED = "dereferenced",
  MARKED = "marked",
  SURVIVED = "survived"
}

export interface MemoryCell {
  state: CellState;
  survivedCycles: number;
  id: number;
}

export const GCSimulator = () => {
  const [heap, setHeap] = useState<MemoryCell[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'sweeping' | 'complete'>('allocating');
  const [gridSize, setGridSize] = useState(15);
  const [speed, setSpeed] = useState(1000); // milliseconds

  // Initialize heap
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalCells = gridSize * gridSize;
    const newHeap: MemoryCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: i
      });
    }
    setHeap(newHeap);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
  };

  const simulateAllocation = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const freeCells = newHeap.filter(cell => cell.state === CellState.FREE);
      
      if (freeCells.length === 0) return newHeap;

      // Allocate 3-5 new objects randomly
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 3, freeCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const randomIndex = Math.floor(Math.random() * freeCells.length);
        const cellToAllocate = freeCells.splice(randomIndex, 1)[0];
        if (cellToAllocate) {
          newHeap[cellToAllocate.id].state = CellState.REFERENCED;
        }
      }

      // Randomly dereference some existing objects
      const referencedCells = newHeap.filter(cell => cell.state === CellState.REFERENCED);
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
        if (cell.state === CellState.REFERENCED) {
          cell.state = CellState.MARKED;
        }
      });
      return newHeap;
    });
    setPhase('marking');
    toast("Marcando objetos en uso...");
  };

  const simulateSweepPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      newHeap.forEach(cell => {
        if (cell.state === CellState.DEREFERENCED) {
          // Free dereferenced cells
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        } else if (cell.state === CellState.MARKED) {
          // Unmark and increment survival count
          cell.state = CellState.SURVIVED;
          cell.survivedCycles++;
        }
      });
      return newHeap;
    });
    setPhase('sweeping');
    toast("Liberando memoria no utilizada...");
  };

  const checkIfHeapFull = () => {
    const freeCells = heap.filter(cell => cell.state === CellState.FREE);
    return freeCells.length < 10; // Consider full when less than 10 free cells
  };

  const nextStep = () => {
    if (phase === 'allocating') {
      if (checkIfHeapFull()) {
        simulateMarkPhase();
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      simulateSweepPhase();
    } else if (phase === 'sweeping') {
      setGcCycles(prev => prev + 1);
      if (gcCycles < 3) {
        setPhase('allocating');
        toast(`Ciclo GC ${gcCycles + 1} completado. Continuando...`);
      } else {
        setPhase('complete');
        setIsRunning(false);
        toast("Simulación completada después de 4 ciclos GC");
      }
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
    if (isRunning && phase !== 'complete') {
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

  const getCellClassName = (cell: MemoryCell) => {
    switch (cell.state) {
      case CellState.FREE:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
      case CellState.REFERENCED:
        return "bg-gc-referenced-cell text-gc-referenced-cell-foreground border-gc-referenced-cell";
      case CellState.DEREFERENCED:
        return "bg-gc-dereferenced-cell text-gc-dereferenced-cell-foreground border-gc-dereferenced-cell";
      case CellState.MARKED:
        return "bg-gc-marked-cell text-gc-marked-cell-foreground border-gc-marked-cell";
      case CellState.SURVIVED:
        return "bg-gc-survived-cell text-gc-survived-cell-foreground border-gc-survived-cell";
      default:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">NON MOVING COLLECTOR</h1>
          <p className="text-xl text-muted-foreground">Demo</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Controles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tamaño de Memoria</label>
                  <select 
                    value={gridSize} 
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full p-2 rounded border bg-background text-foreground"
                  >
                    <option value={10}>10x10 (100 celdas)</option>
                    <option value={12}>12x12 (144 celdas)</option>
                    <option value={15}>15x15 (225 celdas)</option>
                    <option value={18}>18x18 (324 celdas)</option>
                    <option value={20}>20x20 (400 celdas)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Velocidad</label>
                  <select 
                    value={speed} 
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full p-2 rounded border bg-background text-foreground"
                  >
                    <option value={500}>Muy Rápida (0.5s)</option>
                    <option value={1000}>Rápida (1s)</option>
                    <option value={1500}>Normal (1.5s)</option>
                    <option value={2000}>Lenta (2s)</option>
                    <option value={3000}>Muy Lenta (3s)</option>
                  </select>
                </div>

                <div className="pt-2 border-t space-y-1">
                  <p className="text-sm text-muted-foreground">Paso: {currentStep}</p>
                  <p className="text-sm text-muted-foreground">Ciclos GC: {gcCycles}</p>
                  <p className="text-sm text-muted-foreground">Fase: {phase}</p>
                  <p className="text-sm text-muted-foreground">Celdas: {gridSize}x{gridSize}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={toggleSimulation}
                  className="w-full"
                  variant={isRunning ? "secondary" : "default"}
                >
                  {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {phase === 'complete' ? 'Reiniciar' : isRunning ? 'Pausar' : 'Iniciar'}
                </Button>
                
                <Button 
                  onClick={nextStep}
                  disabled={isRunning || phase === 'complete'}
                  className="w-full"
                  variant="outline"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Siguiente Paso
                </Button>
                
                <Button 
                  onClick={initializeHeap}
                  className="w-full"
                  variant="outline"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-3">Proceso:</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Mutator allocates cells in Heap</li>
                  <li>2. Heap is out of memory → GC</li>
                  <li>3. Mark all live cells</li>
                  <li>4. Free all dead cells</li>
                  <li>5. Unmark all live cells</li>
                  <li>6. Resume Mutator</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Memory Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  {phase === 'allocating' ? 'Allocating' : 'Heap'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="grid gap-1 max-w-4xl mx-auto"
                  style={{ 
                    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    maxWidth: gridSize > 15 ? '48rem' : '32rem'
                  }}
                >
                  {heap.map((cell) => (
                    <div
                      key={cell.id}
                      className={`
                        aspect-square border-2 rounded flex items-center justify-center font-bold
                        transition-all duration-300 ${getCellClassName(cell)}
                      `}
                      style={{ 
                        fontSize: gridSize > 18 ? '0.625rem' : gridSize > 15 ? '0.75rem' : '0.875rem'
                      }}
                    >
                      {cell.state === CellState.SURVIVED && cell.survivedCycles > 0 
                        ? cell.survivedCycles 
                        : ''
                      }
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Legend */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Leyenda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-free-cell border-2 border-border rounded"></div>
                <span className="text-sm">Free Cell</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-referenced-cell border-2 border-gc-referenced-cell rounded"></div>
                <span className="text-sm">Referenced Cell</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-dereferenced-cell border-2 border-gc-dereferenced-cell rounded"></div>
                <span className="text-sm">Dereferenced Cell</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-marked-cell border-2 border-gc-marked-cell rounded"></div>
                <span className="text-sm">Marked Cell</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-survived-cell border-2 border-gc-survived-cell rounded flex items-center justify-center text-xs font-bold text-gc-survived-cell-foreground">
                  1
                </div>
                <span className="text-sm">Referenced Cell (survived 1 GC)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};