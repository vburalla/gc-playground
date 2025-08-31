import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  currentStep: number;
  gcCycles: number;
  phase: string;
  isRunning: boolean;
  onToggleSimulation: () => void;
  onNextStep: () => void;
  onReset: () => void;
}

export function AppSidebar({
  gridSize,
  setGridSize,
  speed,
  setSpeed,
  currentStep,
  gcCycles,
  phase,
  isRunning,
  onToggleSimulation,
  onNextStep,
  onReset,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-80"}>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {/* Configuración */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 p-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {!isCollapsed && "Tamaño de Memoria"}
                </label>
                <select 
                  value={gridSize} 
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full p-2 rounded border bg-background text-foreground text-sm"
                  title="Tamaño de Memoria"
                >
                  <option value={10}>10x10</option>
                  <option value={12}>12x12</option>
                  <option value={15}>15x15</option>
                  <option value={18}>18x18</option>
                  <option value={20}>20x20</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {!isCollapsed && "Velocidad"}
                </label>
                <select 
                  value={speed} 
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full p-2 rounded border bg-background text-foreground text-sm"
                  title="Velocidad"
                >
                  <option value={500}>Muy Rápida</option>
                  <option value={1000}>Rápida</option>
                  <option value={1500}>Normal</option>
                  <option value={2000}>Lenta</option>
                  <option value={3000}>Muy Lenta</option>
                </select>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Controles */}
        <SidebarGroup>
          <SidebarGroupLabel>Controles</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 p-4">
              {!isCollapsed && (
                <div className="space-y-2 pb-3 border-b">
                  <p className="text-sm text-muted-foreground">Paso: {currentStep}</p>
                  <p className="text-sm text-muted-foreground">Ciclos GC: {gcCycles}</p>
                  <p className="text-sm text-muted-foreground">Fase: {phase}</p>
                  <p className="text-sm text-muted-foreground">Celdas: {gridSize}x{gridSize}</p>
                </div>
              )}
              
              <Button 
                onClick={onToggleSimulation}
                className="w-full"
                variant={isRunning ? "secondary" : "default"}
                size={isCollapsed ? "icon" : "default"}
                title={phase === 'complete' ? 'Reiniciar' : isRunning ? 'Pausar' : 'Iniciar'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {!isCollapsed && (
                  <span className="ml-2">
                    {phase === 'complete' ? 'Reiniciar' : isRunning ? 'Pausar' : 'Iniciar'}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={onNextStep}
                disabled={isRunning || phase === 'complete'}
                className="w-full"
                variant="outline"
                size={isCollapsed ? "icon" : "default"}
                title="Siguiente Paso"
              >
                <SkipForward className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">Siguiente Paso</span>}
              </Button>
              
              <Button 
                onClick={onReset}
                className="w-full"
                variant="outline"
                size={isCollapsed ? "icon" : "default"}
                title="Reiniciar"
              >
                <RotateCcw className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">Reiniciar</span>}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Proceso */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Proceso</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-4">
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Mutator allocates cells in Heap</li>
                  <li>2. Heap is out of memory → GC</li>
                  <li>3. Mark all live cells</li>
                  <li>4. Free all dead cells</li>
                  <li>5. Unmark all live cells</li>
                  <li>6. Resume Mutator</li>
                </ol>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Leyenda */}
        <SidebarGroup>
          <SidebarGroupLabel>Leyenda</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-free-cell border-2 border-border rounded flex-shrink-0"></div>
                {!isCollapsed && <span className="text-sm">Free Cell</span>}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-referenced-cell border-2 border-gc-referenced-cell rounded flex-shrink-0"></div>
                {!isCollapsed && <span className="text-sm">Referenced Cell</span>}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-dereferenced-cell border-2 border-gc-dereferenced-cell rounded flex-shrink-0"></div>
                {!isCollapsed && <span className="text-sm">Dereferenced Cell</span>}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-marked-cell border-2 border-gc-marked-cell rounded flex-shrink-0"></div>
                {!isCollapsed && <span className="text-sm">Marked Cell</span>}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gc-survived-cell border-2 border-gc-survived-cell rounded flex items-center justify-center text-xs font-bold text-gc-survived-cell-foreground flex-shrink-0">
                  1
                </div>
                {!isCollapsed && <span className="text-sm">Referenced Cell (survived 1 GC)</span>}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}