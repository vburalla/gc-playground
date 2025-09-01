import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  return (
    <header className="w-full bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Garbage Collector Simulator</h1>
          <nav className="flex gap-3">
            <Button asChild variant="outline" size="sm">
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`
                }
              >
                Non-Moving GC
              </NavLink>
            </Button>
            <Button asChild variant="outline" size="sm">
              <NavLink 
                to="/compacting" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`
                }
              >
                Compacting GC
              </NavLink>
            </Button>
            <Button asChild variant="outline" size="sm">
              <NavLink 
                to="/copy" 
                className={({ isActive }) => 
                  `transition-all ${isActive ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`
                }
              >
                Copy GC
              </NavLink>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};