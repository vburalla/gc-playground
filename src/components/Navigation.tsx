import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <header className="w-full bg-gradient-bg border-b border-border/50 shadow-lg backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-foreground bg-gradient-to-r from-primary to-ring bg-clip-text text-transparent">
              Java Virtual Machine Explorer
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Garbage Collection & JVM Memory Simulation</p>
          </div>
          <nav className="flex gap-2 flex-wrap">
            <div className="flex gap-2">
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
            </div>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex gap-2">
            <Button asChild size="sm">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                Non-Moving GC
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/compacting" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                Compacting GC
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/copy" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                Copy GC
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/generational" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                Generational GC
              </NavLink>
            </Button>
            <Button asChild size="sm">
              <NavLink 
                to="/g1" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`
                }
              >
                G1 GC
              </NavLink>
              </Button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};