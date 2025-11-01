import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export const Navigation = () => {
  return (
    <header className="w-full bg-gradient-bg border-b border-border/50 shadow-lg backdrop-blur-sm">
      <div className="w-full px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-ring bg-clip-text text-transparent">
              Java Virtual Machine Explorer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Garbage Collection & JVM Memory Simulation</p>
          </div>
          <nav className="flex gap-2 flex-wrap">
            <Button asChild size="sm">
              <NavLink 
                to="/pc-register" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                PC Register
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/jvm-simulator" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                JVM Simulator
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/virtual-threads" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                Virtual Threads
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/threadpool" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                ThreadPool
              </NavLink>
            </Button>
            
            <div className="h-6 w-px bg-border"></div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  GC Simulators
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem asChild>
                  <NavLink to="/non-moving" className="cursor-pointer">
                    Non-Moving GC
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/compacting" className="cursor-pointer">
                    Compacting GC
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/copy" className="cursor-pointer">
                    Copy GC
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/generational" className="cursor-pointer">
                    Generational GC
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <NavLink to="/g1" className="cursor-pointer">
                    G1 GC
                  </NavLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
};