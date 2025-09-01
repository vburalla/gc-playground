import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <header className="w-full bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Garbage Collector Simulator</h1>
          <nav className="flex gap-3">
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
          </nav>
        </div>
      </div>
    </header>
  );
};